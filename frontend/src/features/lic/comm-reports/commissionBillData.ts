export type BillType = "consolidated" | "agent-wise";

export interface CommissionBillFormData {
  reportDate: string; // e.g. "2026-09-01" or "01/Sep/2026"
  dataFilters: Array<{ type: string; id: string; name: string }>;
  billType: BillType;
  billCode: string; // e.g. "12/206"
}

export type CommissionCategory = "first-comm" | "first-year" | "second-third" | "subsequent";

export interface CommissionBillItem {
  id: string;
  policyNo: string;
  agentCode: string;
  groupCode: string;
  policyHolderName: string;
  dueDate: string;
  premiumAmount: number;
  commissionAmount: number;
  comCode: number; // 1 = First Comm, 4 = First Year, 2 = 2nd/3rd Year, 3 = Subsequent Year
  comDate: string;
  planTermPpt: string;
  dateOfPay: string;
  recoveryCause?: string;
  category: CommissionCategory;
}

export interface CommissionBillSummaryCategory {
  category: CommissionCategory;
  label: string;
  received: number;
  lessRecoveries: number;
  nett: number;
}

export interface CommissionBillSummary {
  firstCommission: number;
  firstYear: number;
  secondThirdYear: number;
  subsequentYear: number;
  totalCommission: number;
  totalPremium: number;
  taxDeduction: number;
  netBillAmount: number;
  categorySummaries: CommissionBillSummaryCategory[];
}

// Clean empty array - all hardcoded sample items removed
export const SAMPLE_COMMISSION_BILL_ITEMS: CommissionBillItem[] = [];

export interface PolicyLike {
  id?: string | number;
  policyNumber?: string;
  policyNo?: string;
  agentCode?: string;
  advisor?: { advisorCode?: string; advisorName?: string };
  CustomerMaster?: { name?: string; firstName?: string; lastName?: string };
  customer?: { name?: string; groupName?: string; groupCode?: string };
  premium?: { installmentPremium?: number; totalInstallmentPremium?: number };
  premiumAmount?: number;
  commencementDate?: string | Date;
  product?: { planNumber?: string };
  policyTerm?: string | number;
  premiumPayingTerm?: string | number;
}

/**
 * Dynamic calculation engine that takes policies from Redux
 * and formats them into CommissionBillItems with calculated rates.
 */
export function generateCommissionBillItems(
  policies: Array<PolicyLike> = [],
  agencyFilters: string[] = []
): CommissionBillItem[] {
  if (policies && policies.length > 0) {
    const items: CommissionBillItem[] = [];

    policies.forEach((p, idx) => {
      // Check agency filter if provided
      const pAgCode = (p.agentCode || "").toLowerCase().trim();
      const pAdvCode = (p.advisor?.advisorCode || "").toLowerCase().trim();
      const pAdvName = (p.advisor?.advisorName || "").toLowerCase().trim();

      if (agencyFilters.length > 0) {
        const matches = agencyFilters.some((f) => {
          const fl = f.toLowerCase().trim();
          if (fl.includes("jayant")) return pAgCode.includes("a001") || pAdvCode.includes("a001") || pAdvName.includes("jayant");
          if (fl.includes("manisha")) return pAgCode.includes("a004") || pAdvCode.includes("a004") || pAdvName.includes("manisha");
          return true;
        });
        if (!matches) return;
      }

      const policyNo = p.policyNumber || p.policyNo || `POL-${idx + 1}`;
      const holderName =
        p.CustomerMaster?.name ||
        `${p.CustomerMaster?.firstName || ""} ${p.CustomerMaster?.lastName || ""}`.trim() ||
        p.customer?.name ||
        p.customer?.groupName ||
        `Policy Holder ${idx + 1}`;

      const groupCode = p.customer?.groupCode || "-";
      const premium = Number(
        p.premium?.installmentPremium ||
          p.premium?.totalInstallmentPremium ||
          p.premiumAmount ||
          0
      );

      // Determine policy age from commencement date
      const doc = p.commencementDate ? new Date(p.commencementDate) : new Date();
      const now = new Date();
      const yearsDiff = Math.max(0, now.getFullYear() - doc.getFullYear());

      let category: CommissionCategory = "first-comm";
      let comCode = 1;
      let commPercent = 0.25; // 25% first commission base

      if (yearsDiff === 0) {
        category = idx % 2 === 0 ? "first-comm" : "first-year";
        comCode = category === "first-comm" ? 1 : 4;
        commPercent = 0.35; // 35% standard 1st year with bonus
      } else if (yearsDiff >= 1 && yearsDiff <= 3) {
        category = "second-third";
        comCode = 2;
        commPercent = 0.075; // 7.5%
      } else {
        category = "subsequent";
        comCode = 3;
        commPercent = 0.05; // 5%
      }

      const commission = Math.round(premium * commPercent * 100) / 100;
      const mm = String(doc.getMonth() + 1).padStart(2, "0");
      const yy = String(doc.getFullYear()).slice(-2);
      const comDate = `${mm}/${yy}`;
      const dueDate = doc.toLocaleDateString("en-IN", { month: "2-digit", year: "2-digit" });
      const plan = p.product?.planNumber || "815";
      const term = p.policyTerm || "20";
      const ppt = p.premiumPayingTerm || "20";

      items.push({
        id: p.id ? String(p.id) : `dyn-${idx}`,
        policyNo,
        agentCode: p.agentCode || p.advisor?.advisorCode || "AG",
        groupCode,
        policyHolderName: holderName.startsWith("Mr.") || holderName.startsWith("Ms.") || holderName.startsWith("Mrs.") ? holderName : `Mr. ${holderName}`,
        dueDate,
        premiumAmount: premium,
        commissionAmount: commission,
        comCode,
        comDate,
        planTermPpt: `${plan}/${term}/${ppt}`,
        dateOfPay: new Date().toLocaleDateString("en-IN"),
        recoveryCause: "",
        category,
      });
    });

    return items;
  }

  // Return empty array if no policies available
  return [];
}

/**
 * Calculates complete summary totals, deductions, and categories
 */
export function calculateCommissionBillSummary(items: CommissionBillItem[]): CommissionBillSummary {
  let firstComm = 0;
  let firstYear = 0;
  let secondThird = 0;
  let subsequent = 0;
  let totalPremium = 0;

  items.forEach((item) => {
    totalPremium += item.premiumAmount;
    if (item.comCode === 1 || item.category === "first-comm") {
      firstComm += item.commissionAmount;
    } else if (item.comCode === 4 || item.category === "first-year") {
      firstYear += item.commissionAmount;
    } else if (item.comCode === 2 || item.category === "second-third") {
      secondThird += item.commissionAmount;
    } else if (item.comCode === 3 || item.category === "subsequent") {
      subsequent += item.commissionAmount;
    }
  });

  const totalCommission = Math.round((firstComm + firstYear + secondThird + subsequent) * 100) / 100;
  const taxDeduction = Math.round(totalCommission * 0.05 * 100) / 100; // Standard 5% TDS (Section 194D)
  const netBillAmount = Math.round((totalCommission - taxDeduction) * 100) / 100;

  const categorySummaries: CommissionBillSummaryCategory[] = [
    {
      category: "first-comm",
      label: "First Commission",
      received: Math.round(firstComm * 100) / 100,
      lessRecoveries: 0,
      nett: Math.round(firstComm * 100) / 100,
    },
    {
      category: "first-year",
      label: "First Year",
      received: Math.round(firstYear * 100) / 100,
      lessRecoveries: 0,
      nett: Math.round(firstYear * 100) / 100,
    },
    {
      category: "second-third",
      label: "Second/Third Year",
      received: Math.round(secondThird * 100) / 100,
      lessRecoveries: 0,
      nett: Math.round(secondThird * 100) / 100,
    },
    {
      category: "subsequent",
      label: "Subsequent Year",
      received: Math.round(subsequent * 100) / 100,
      lessRecoveries: 0,
      nett: Math.round(subsequent * 100) / 100,
    },
  ];

  return {
    firstCommission: Math.round(firstComm * 100) / 100,
    firstYear: Math.round(firstYear * 100) / 100,
    secondThirdYear: Math.round(secondThird * 100) / 100,
    subsequentYear: Math.round(subsequent * 100) / 100,
    totalCommission,
    totalPremium: Math.round(totalPremium * 100) / 100,
    taxDeduction,
    netBillAmount,
    categorySummaries,
  };
}
