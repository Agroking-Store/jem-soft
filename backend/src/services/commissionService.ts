import { prisma } from "../config/database.js";
import { AppError } from "../utils/AppError.js";
import { ParsedCommissionItem } from "./commissionParserService.js";

export interface CreateBillPayload {
  billNumber: string;
  billDate: string; // ISO date string
  agencyId?: string;
  advisorId?: string;
  agencyCode?: string;
  billType?: string;
  fileName?: string;
  fileUrl?: string;
  totalPremium?: number;
  grossCommission?: number;
  items?: ParsedCommissionItem[];
}

/**
 * Expected commission calculation helper based on LIC slabs
 */
export function calculateExpectedCommission(
  premium: number,
  comCode: number,
  ppt: number = 20,
): number {
  if (premium <= 0) return 0;

  if (comCode === 1 || comCode === 4) {
    // First Year: 25% + 10% bonus = 35% (for PPT >= 15)
    const rate = ppt >= 15 ? 0.35 : ppt >= 10 ? 0.28 : 0.14;
    return Math.round(premium * rate * 100) / 100;
  } else if (comCode === 2) {
    // 2nd and 3rd Year: 7.5%
    return Math.round(premium * 0.075 * 100) / 100;
  } else {
    // Subsequent Years: 5.0%
    return Math.round(premium * 0.05 * 100) / 100;
  }
}

/**
 * Ingest and process a Commission Bill statement
 */
export async function saveCommissionBill(payload: CreateBillPayload) {
  const {
    billNumber,
    billDate,
    agencyId,
    advisorId,
    agencyCode,
    billType = "consolidated",
    fileName,
    fileUrl,
    items = [],
    totalPremium: rawTotalPrem,
    grossCommission: rawGrossComm,
  } = payload;

  if (!billNumber || !billDate) {
    throw new AppError("Bill number and date are required.", 400);
  }

  // Calculate totals across items or use cover amounts
  let totalPremium = Number(rawTotalPrem || 0);
  let grossCommission = Number(rawGrossComm || 0);

  if (items && items.length > 0) {
    totalPremium = 0;
    grossCommission = 0;
    items.forEach((item) => {
      totalPremium += Number(item.premiumAmount || 0);
      grossCommission += Number(item.commissionAmount || 0);
    });
  }

  totalPremium = Math.round(totalPremium * 100) / 100;
  grossCommission = Math.round(grossCommission * 100) / 100;
  const taxDeduction = Math.round(grossCommission * 0.05 * 100) / 100; // 5% TDS
  const netPayable = Math.round((grossCommission - taxDeduction) * 100) / 100;

  // 1. Create CommissionBill in PostgreSQL
  const billInsertRes: any[] = await prisma.$queryRawUnsafe(
    `INSERT INTO "CommissionBill" (
      "id", "billNumber", "billDate", "agencyId", "advisorId", "agencyCode",
      "billType", "totalPremium", "grossCommission", "taxDeduction", "netPayable",
      "fileName", "fileUrl", "createdAt", "updatedAt"
    ) VALUES (
      gen_random_uuid()::text, $1, $2::timestamp, $3, $4, $5,
      $6, $7, $8, $9, $10,
      $11, $12, NOW(), NOW()
    ) RETURNING *;`,
    billNumber,
    new Date(billDate),
    agencyId || null,
    advisorId || null,
    agencyCode || null,
    billType,
    totalPremium,
    grossCommission,
    taxDeduction,
    netPayable,
    fileName || null,
    fileUrl || null
  );

  const bill = billInsertRes[0];

  // 2. Fetch existing policies to link policyId when matching policyNumber
  const policyNumbers = items.map((i) => i.policyNo.trim());
  let existingPolicies: any[] = [];
  if (policyNumbers.length > 0) {
    existingPolicies = await prisma.policy.findMany({
      where: { policyNumber: { in: policyNumbers } },
      select: { id: true, policyNumber: true, premiumPayingTerm: true, advisorId: true },
    });
  }

  const policyMap = new Map<string, any>();
  existingPolicies.forEach((p) => policyMap.set(p.policyNumber.trim(), p));

  // 3. Insert each CommissionRecord
  for (const item of items) {
    const matchedPolicy = policyMap.get(item.policyNo.trim());
    const policyId = matchedPolicy?.id || null;
    const itemAdvisorId = advisorId || matchedPolicy?.advisorId || null;

    const expectedAmount = calculateExpectedCommission(
      item.premiumAmount,
      item.comCode,
      matchedPolicy?.premiumPayingTerm || 20
    );

    const diff = Math.round((item.commissionAmount - expectedAmount) * 100) / 100;
    let status = "RECEIVED";
    if (diff < -5) {
      status = "SHORT"; // Underpaid by more than 5 rupees
    }

    await prisma.$queryRawUnsafe(
      `INSERT INTO "CommissionRecord" (
        "id", "policyId", "policyNumber", "policyHolderName", "groupCode",
        "advisorId", "agentCode", "agencyId", "billId", "dueDate", "dateOfPayment",
        "premiumAmount", "commissionAmount", "commissionCode", "commissionDate",
        "planTermPpt", "category", "recoveryCause", "status",
        "expectedAmount", "differenceAmount", "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid()::text, $1, $2, $3, $4,
        $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14,
        $15, $16, $17, $18,
        $19, $20, NOW(), NOW()
      );`,
      policyId,
      item.policyNo,
      item.policyHolderName || null,
      item.groupCode || null,
      itemAdvisorId,
      item.agentCode || null,
      agencyId || null,
      bill.id,
      item.dueDate || null,
      item.dateOfPay || null,
      item.premiumAmount,
      item.commissionAmount,
      item.comCode,
      item.comDate || null,
      item.planTermPpt || null,
      item.category || "first-comm",
      item.recoveryCause || null,
      status,
      expectedAmount,
      diff
    );
  }

  return {
    bill,
    itemCount: items.length,
    totalPremium,
    grossCommission,
    taxDeduction,
    netPayable,
  };
}

/**
 * List all uploaded commission bills
 */
export async function getAllCommissionBills(agencyId?: string) {
  let query = `
    SELECT 
      b.*,
      COUNT(r.id)::int as "itemCount",
      a."agencyName"
    FROM "CommissionBill" b
    LEFT JOIN "CommissionRecord" r ON r."billId" = b.id
    LEFT JOIN "Agency" a ON a.id = b."agencyId"
  `;

  const params: any[] = [];
  if (agencyId) {
    query += ` WHERE b."agencyId" = $1 `;
    params.push(agencyId);
  }

  query += ` GROUP BY b.id, a."agencyName" ORDER BY b."billDate" DESC, b."createdAt" DESC;`;

  return await prisma.$queryRawUnsafe(query, ...params);
}

/**
 * Get single commission bill with all records
 */
export async function getCommissionBillById(id: string) {
  const bills: any[] = await prisma.$queryRawUnsafe(
    `SELECT b.*, a."agencyName" FROM "CommissionBill" b LEFT JOIN "Agency" a ON a.id = b."agencyId" WHERE b.id = $1;`,
    id
  );

  if (bills.length === 0) {
    throw new AppError("Commission bill not found", 404);
  }

  const bill = bills[0];
  const records: any[] = await prisma.$queryRawUnsafe(
    `SELECT * FROM "CommissionRecord" WHERE "billId" = $1 ORDER BY "commissionCode" ASC, "premiumAmount" DESC;`,
    id
  );

  return { ...bill, records };
}

/**
 * Query complete Commission Ledger across all policies/dates
 */
export async function getCommissionLedger(filters: {
  fromDate?: string;
  toDate?: string;
  agencyId?: string;
  advisorId?: string;
  policyNumber?: string;
  status?: string;
}) {
  let query = `
    SELECT 
      r.*,
      b."billNumber",
      b."billDate",
      a."advisorName",
      ag."agencyName"
    FROM "CommissionRecord" r
    LEFT JOIN "CommissionBill" b ON b.id = r."billId"
    LEFT JOIN "Advisor" a ON a.id = r."advisorId"
    LEFT JOIN "Agency" ag ON ag.id = r."agencyId"
    WHERE 1=1
  `;

  const params: any[] = [];
  let paramIdx = 1;

  if (filters.fromDate) {
    query += ` AND b."billDate" >= $${paramIdx++}::timestamp `;
    params.push(new Date(filters.fromDate));
  }
  if (filters.toDate) {
    query += ` AND b."billDate" <= $${paramIdx++}::timestamp `;
    params.push(new Date(filters.toDate));
  }
  if (filters.agencyId) {
    query += ` AND (r."agencyId" = $${paramIdx++} OR b."agencyId" = $${paramIdx - 1}) `;
    params.push(filters.agencyId);
  }
  if (filters.advisorId) {
    query += ` AND r."advisorId" = $${paramIdx++} `;
    params.push(filters.advisorId);
  }
  if (filters.policyNumber) {
    query += ` AND r."policyNumber" ILIKE $${paramIdx++} `;
    params.push(`%${filters.policyNumber.trim()}%`);
  }
  if (filters.status) {
    query += ` AND r."status" = $${paramIdx++} `;
    params.push(filters.status);
  }

  query += ` ORDER BY b."billDate" DESC NULLS LAST, r."createdAt" DESC;`;

  const records: any[] = await prisma.$queryRawUnsafe(query, ...params);

  // Compute summary totals
  let totalPremium = 0;
  let totalGross = 0;
  let totalTds = 0;
  let totalNet = 0;

  records.forEach((r) => {
    const prem = Number(r.premiumAmount || 0);
    const comm = Number(r.commissionAmount || 0);
    const tds = Math.round(comm * 0.05 * 100) / 100;
    totalPremium += prem;
    totalGross += comm;
    totalTds += tds;
    totalNet += comm - tds;
  });

  return {
    records,
    summary: {
      totalRecords: records.length,
      totalPremium: Math.round(totalPremium * 100) / 100,
      totalGross: Math.round(totalGross * 100) / 100,
      totalTds: Math.round(totalTds * 100) / 100,
      totalNet: Math.round(totalNet * 100) / 100,
    },
  };
}

/**
 * Expected future commissions forecast based on upcoming policy dues
 */
export async function getCommissionForecast(daysAhead: number = 90) {
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + daysAhead);

  // Fetch policies with upcoming premium due dates
  const policies = await prisma.policy.findMany({
    where: {
      nextPremiumDueDate: {
        gte: new Date(),
        lte: maxDate,
      },
      status: {
        statusCode: { in: ["ACTIVE", "IN_FORCE", "active", "in_force"] },
      },
    },
    include: {
      premium: true,
      CustomerMaster: true,
      advisor: true,
      product: true,
    },
    orderBy: { nextPremiumDueDate: "asc" },
  });

  let totalForecastAmount = 0;
  let totalDuePremiums = 0;

  const forecastItems = policies.map((p) => {
    const premium = Number(p.premium?.installmentPremium || p.premium?.totalInstallmentPremium || 0);
    totalDuePremiums += premium;

    // Estimate policy year from commencementDate
    const startYear = p.commencementDate ? new Date(p.commencementDate).getFullYear() : new Date().getFullYear();
    const currentYear = new Date().getFullYear();
    const policyYear = Math.max(1, currentYear - startYear + 1);

    const comCode = policyYear === 1 ? 4 : policyYear <= 3 ? 2 : 3;
    const expectedComm = calculateExpectedCommission(premium, comCode, p.premiumPayingTerm || 20);
    totalForecastAmount += expectedComm;

    return {
      policyId: p.id,
      policyNumber: p.policyNumber,
      clientName: `${p.CustomerMaster?.firstName || ""} ${p.CustomerMaster?.lastName || ""}`.trim() || "Policyholder",
      dueDate: p.nextPremiumDueDate,
      installmentPremium: premium,
      policyYear,
      comCode,
      expectedCommission: expectedComm,
      planName: p.product?.productName || "LIC Policy",
      advisorName: p.advisor?.advisorName || "Direct",
    };
  });

  return {
    forecastDays: daysAhead,
    totalPoliciesDue: policies.length,
    totalDuePremiums: Math.round(totalDuePremiums * 100) / 100,
    totalForecastCommission: Math.round(totalForecastAmount * 100) / 100,
    items: forecastItems,
  };
}

/**
 * Get short and gap commission discrepancies
 */
export async function getCommissionDiscrepancies() {
  const shortRecords: any[] = await prisma.$queryRawUnsafe(`
    SELECT 
      r.*,
      b."billNumber",
      b."billDate",
      a."advisorName"
    FROM "CommissionRecord" r
    LEFT JOIN "CommissionBill" b ON b.id = r."billId"
    LEFT JOIN "Advisor" a ON a.id = r."advisorId"
    WHERE r."status" = 'SHORT' OR (r."differenceAmount" IS NOT NULL AND r."differenceAmount" < -5)
    ORDER BY r."differenceAmount" ASC;
  `);

  return {
    totalDiscrepancies: shortRecords.length,
    totalShortAmount: shortRecords.reduce((sum, r) => sum + Math.abs(Number(r.differenceAmount || 0)), 0),
    shortRecords,
  };
}

/**
 * Delete a commission bill and its child records
 */
export async function deleteCommissionBill(id: string) {
  await prisma.$queryRawUnsafe(`DELETE FROM "CommissionRecord" WHERE "billId" = $1;`, id);
  await prisma.$queryRawUnsafe(`DELETE FROM "CommissionBill" WHERE id = $1;`, id);
  return { success: true, message: "Commission bill deleted successfully" };
}
