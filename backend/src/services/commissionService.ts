import { prisma } from "../config/database.js";
import { AppError } from "../utils/AppError.js";
import { ParsedCommissionItem } from "./commissionParserService.js";
import {
  parseLicStatementPdf,
  parseDateUtc,
  LicStatementReconciledRow,
} from "./licStatementParserService.js";

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


export interface ReconcileLicStatementOptions {
  agencyId?: string;
  advisorId?: string;
}

/**
 * Reconcile an uploaded LIC statement PDF against policies & premium payments in database
 */
export async function reconcileLicStatement(
  fileInput: string | Buffer | Uint8Array,
  _options?: ReconcileLicStatementOptions
) {
  const summary = await parseLicStatementPdf(fileInput);

  if (!summary.rows || summary.rows.length === 0) {
    throw new AppError("No tabular data could be extracted from the uploaded PDF statement.", 400);
  }

  // Pre-fetch all policy numbers from PostgreSQL in one query
  const policyNumbers = Array.from(new Set(summary.rows.map((r) => r.policyNumber.trim())));

  const policies = await prisma.policy.findMany({
    where: {
      policyNumber: { in: policyNumbers },
    },
    include: {
      customer: { select: { id: true, groupName: true, groupCode: true } },
      CustomerMaster: { select: { id: true, firstName: true, middleName: true, lastName: true } },
      advisor: { select: { id: true, advisorName: true, advisorCode: true } },
      product: { select: { id: true, productName: true, planNumber: true } },
      premiumPayments: {
        include: { paymentStatus: true },
      },
    },
  });

  const policyMap = new Map<string, (typeof policies)[0]>();
  policies.forEach((p) => policyMap.set(p.policyNumber.trim(), p));

  const reconciledRows: LicStatementReconciledRow[] = [];
  let readyToPayCount = 0;
  let alreadyPaidCount = 0;
  let unmatchedCount = 0;

  for (const row of summary.rows) {
    const policy = policyMap.get(row.policyNumber.trim());

    if (!policy) {
      unmatchedCount++;
      reconciledRows.push({
        ...row,
        status: "POLICY_NOT_FOUND",
        statusDescription: "Policy does not exist in Jem Soft database",
      });
      continue;
    }

    const cm = policy.CustomerMaster;
    const customerName = cm
      ? [cm.firstName, cm.middleName, cm.lastName].filter(Boolean).join(" ")
      : policy.customer?.groupName || row.policyHolderName;

    const rowDueDate = parseDateUtc(row.dueDate);

    // Find payment matching dueDate (UTC day match)
    const payment = policy.premiumPayments.find((p) => {
      const d = new Date(p.dueDate);
      return (
        d.getUTCFullYear() === rowDueDate.getUTCFullYear() &&
        d.getUTCMonth() === rowDueDate.getUTCMonth() &&
        d.getUTCDate() === rowDueDate.getUTCDate()
      );
    });

    if (payment) {
      const isPaid = payment.paymentStatus.statusCode === "PAID";
      if (isPaid) {
        alreadyPaidCount++;
        reconciledRows.push({
          ...row,
          status: "MATCHED_ALREADY_PAID",
          policyId: policy.id,
          customerName,
          paymentId: payment.id,
          existingPaymentStatus: "PAID",
          statusDescription: `Already marked as PAID on ${
            payment.paidDate ? new Date(payment.paidDate).toISOString().split("T")[0] : "earlier date"
          }`,
        });
      } else {
        readyToPayCount++;
        reconciledRows.push({
          ...row,
          status: "MATCHED_UNPAID",
          policyId: policy.id,
          customerName,
          paymentId: payment.id,
          existingPaymentStatus: payment.paymentStatus.statusCode,
          statusDescription: "Ready to apply payment (Policy and UNPAID schedule matched)",
        });
      }
    } else {
      // Policy exists, but no installment was scheduled for this specific due date
      readyToPayCount++;
      reconciledRows.push({
        ...row,
        status: "PAYMENT_NOT_FOUND",
        policyId: policy.id,
        customerName,
        statusDescription: "Policy matched; new installment schedule will be created and marked PAID",
      });
    }
  }

  const matchedPoliciesSet = new Set(
    reconciledRows.filter((r) => r.policyId).map((r) => r.policyNumber)
  );
  const unmatchedPoliciesSet = new Set(
    reconciledRows.filter((r) => !r.policyId).map((r) => r.policyNumber)
  );

  return {
    metadata: {
      branchCode: summary.branchCode,
      agentName: summary.agentName,
      agentCode: summary.agentCode,
      leaderCode: summary.leaderCode,
      voucherDate: summary.voucherDate,
      batch: summary.batch,
    },
    totals: {
      grandTotalPremium: summary.grandTotalPremium,
      grandTotalCommission: summary.grandTotalCommission,
      calculatedTotalPremium: summary.calculatedTotalPremium,
      calculatedTotalCommission: summary.calculatedTotalCommission,
      isChecksumValid: summary.isChecksumValid,
      checksumDiscrepancy: summary.checksumDiscrepancy,
    },
    statistics: {
      totalRows: summary.rows.length,
      matchedPoliciesCount: matchedPoliciesSet.size,
      unmatchedPoliciesCount: unmatchedPoliciesSet.size,
      readyToPayCount,
      alreadyPaidCount,
      unmatchedCount,
    },
    rows: reconciledRows,
  };
}

export interface ApplyLicStatementPayload {
  billNumber?: string;
  billDate?: string;
  agencyId?: string;
  advisorId?: string;
  agencyCode?: string;
  fileName?: string;
  fileUrl?: string;
  batch?: string;
  rows: LicStatementReconciledRow[];
  skipAlreadyPaid?: boolean;
}

/**
 * Apply reconciled statement rows to update PremiumPayment records to PAID
 * and create the associated CommissionBill and CommissionRecord ledger entries.
 */
export async function applyLicStatementPayments(payload: ApplyLicStatementPayload) {
  const {
    rows,
    agencyId,
    advisorId,
    agencyCode,
    fileName,
    fileUrl,
    batch,
    skipAlreadyPaid = true,
  } = payload;

  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    throw new AppError("No reconciled statement rows provided to apply.", 400);
  }

  const paidStatus = await prisma.paymentStatusMaster.findFirst({
    where: { statusCode: "PAID" },
  });
  if (!paidStatus) {
    throw new AppError("System configuration error: PAID payment status master not found.", 500);
  }

  // Find or resolve Advisor
  let resolvedAdvisorId = advisorId;
  if (!resolvedAdvisorId && agencyCode) {
    const adv = await prisma.advisor.findFirst({
      where: {
        OR: [{ advisorCode: agencyCode }, { advisorCode: agencyCode.replace(/^LIC/, "") }],
      },
    });
    if (adv) resolvedAdvisorId = adv.id;
  }

  const billNumber =
    payload.billNumber ||
    (batch ? `BILL-${batch.replace(/[^a-zA-Z0-9]/g, "-")}` : `BILL-${Date.now().toString().slice(-6)}`);
  const billDate = payload.billDate ? new Date(payload.billDate) : new Date();

  // Filter rows eligible for payment application
  const rowsToApply = rows.filter((r) => {
    if (r.status === "POLICY_NOT_FOUND") return false;
    if (skipAlreadyPaid && r.status === "MATCHED_ALREADY_PAID") return false;
    return true;
  });

  let appliedPaymentsCount = 0;
  const CHUNK_SIZE = 50;

  // Process payment updates in transactional chunks of 50
  for (let i = 0; i < rowsToApply.length; i += CHUNK_SIZE) {
    const chunk = rowsToApply.slice(i, i + CHUNK_SIZE);

    await prisma.$transaction(async (tx) => {
      for (const row of chunk) {
        if (!row.policyId) continue;

        const dueDateUtc = parseDateUtc(row.dueDate);
        const adjDateUtc = parseDateUtc(row.adjDate);
        const paymentModeStr = `CBO Adjustment (${row.cbo || "Branch"})`;
        const paymentDetailsStr = `Settled via LIC Bill ${billNumber} [Batch: ${batch || "N/A"}] on ${row.adjDate}`;

        let payment = row.paymentId
          ? await tx.premiumPayment.findUnique({ where: { id: row.paymentId } })
          : await tx.premiumPayment.findFirst({
              where: {
                policyId: row.policyId,
                dueDate: dueDateUtc,
              },
            });

        if (payment) {
          await tx.premiumPayment.update({
            where: { id: payment.id },
            data: {
              paidDate: adjDateUtc,
              premiumAmount: row.premium,
              paymentStatusId: paidStatus.id,
              paymentMode: paymentModeStr,
              paymentDetails: paymentDetailsStr,
            },
          });
        } else {
          payment = await tx.premiumPayment.create({
            data: {
              policyId: row.policyId,
              dueDate: dueDateUtc,
              paidDate: adjDateUtc,
              premiumAmount: row.premium,
              paymentStatusId: paidStatus.id,
              paymentMode: paymentModeStr,
              paymentDetails: paymentDetailsStr,
            },
          });
        }

        // Advance policy nextDueDate if this paid due date is >= current policy nextDueDate
        const policy = await tx.policy.findUnique({
          where: { id: row.policyId },
          select: { id: true, nextPremiumDueDate: true },
        });

        if (policy) {
          if (!policy.nextPremiumDueDate || dueDateUtc >= policy.nextPremiumDueDate) {
            const nextYearDate = new Date(dueDateUtc);
            nextYearDate.setUTCFullYear(nextYearDate.getUTCFullYear() + 1);
            await tx.policy.update({
              where: { id: policy.id },
              data: { nextPremiumDueDate: nextYearDate },
            });
          }
        }

        appliedPaymentsCount++;
      }
    });
  }

  // Calculate bill totals across all statement rows
  const totalStatementPremium =
    Math.round(rows.reduce((acc, r) => acc + (Number(r.premium) || 0), 0) * 100) / 100;
  const totalStatementCommission =
    Math.round(rows.reduce((acc, r) => acc + (Number(r.commission) || 0), 0) * 100) / 100;
  const taxDeduction = Math.round(totalStatementCommission * 0.05 * 100) / 100; // 5% TDS
  const netPayable = Math.round((totalStatementCommission - taxDeduction) * 100) / 100;

  // Create CommissionBill record
  const commissionBill = await prisma.commissionBill.create({
    data: {
      billNumber,
      billDate,
      agencyId: agencyId || null,
      advisorId: resolvedAdvisorId || null,
      agencyCode: agencyCode || null,
      billType: "statement-upload",
      totalPremium: totalStatementPremium,
      grossCommission: totalStatementCommission,
      taxDeduction,
      netPayable,
      fileName: fileName || null,
      fileUrl: fileUrl || null,
    },
  });

  // Create CommissionRecord line items in chunks
  let commissionRecordsCount = 0;
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    await prisma.commissionRecord.createMany({
      data: chunk.map((r) => ({
        policyId: r.policyId || null,
        policyNumber: r.policyNumber,
        policyHolderName: r.policyHolderName,
        advisorId: resolvedAdvisorId || null,
        agentCode: agencyCode || null,
        agencyId: agencyId || null,
        billId: commissionBill.id,
        dueDate: r.dueDate,
        dateOfPayment: r.adjDate,
        premiumAmount: Number(r.premium) || 0,
        commissionAmount: Number(r.commission) || 0,
        commissionCode: 3,
        commissionDate: billDate.toISOString().slice(0, 7),
        planTermPpt: `${r.plan}/${r.term}`,
        category: "subsequent",
        status: "RECEIVED",
        expectedAmount: Number(r.commission) || 0,
        differenceAmount: 0,
      })),
    });
    commissionRecordsCount += chunk.length;
  }

  return {
    success: true,
    billId: commissionBill.id,
    billNumber: commissionBill.billNumber,
    billDate: commissionBill.billDate,
    appliedPaymentsCount,
    commissionRecordsCount,
    totalRows: rows.length,
    totalPremium: totalStatementPremium,
    grossCommission: totalStatementCommission,
    netPayable,
    message: `Successfully processed ${appliedPaymentsCount} premium payments as PAID and created commission bill ${billNumber}.`,
  };
}
