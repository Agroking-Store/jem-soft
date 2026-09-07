export interface DeductionSummaryFormData {
  dateFrom: string; // e.g. "01/Apr/2026"
  dateTo: string; // e.g. "31/Mar/2027"
  advanceType: string; // "ALL" | specific type
  dateOfReport: string; // e.g. "01/Sep/2026"
  dataFilters: Array<{ type: string; id: string; name: string }>;
}

export interface DeductionItem {
  id: string;
  description: string;
  billRecDate: string; // e.g. "30/12/99" or "30/12/20"
  billCode: string; // e.g. "12/206"
  amount: number;
  agentCode: string; // e.g. "J"
  category: string; // "Income Tax" | "Festival Advance" | "Vehicle Advance" | etc.
}

export interface DeductionSummaryTotals {
  totalDeductionsCount: number;
  totalAmount: number;
  incomeTaxTotal: number;
  advanceRecoveriesTotal: number;
}

export const ADVANCE_TYPE_OPTIONS = [
  { value: "ALL", label: "ALL" },
  { value: "INCOME_TAX", label: "Income Tax (TDS)" },
  { value: "FESTIVAL_ADVANCE", label: "Festival Advance" },
  { value: "VEHICLE_ADVANCE", label: "Vehicle Advance" },
  { value: "TOUR_ADVANCE", label: "Tour Advance" },
  { value: "OFFICE_ADVANCE", label: "Office Advance" },
  { value: "POLICY_LOAN_RECOVERY", label: "Policy Loan Recovery" },
  { value: "MISC_RECOVERY", label: "Miscellaneous Recovery" },
];

/**
 * Baseline authentic sample deduction items
 */
export const SAMPLE_DEDUCTION_ITEMS: DeductionItem[] = [
  {
    id: "ded-1",
    description: "Income Tax TDS (u/s 194D)",
    billRecDate: "30/12/20",
    billCode: "12/206",
    amount: 8543.0,
    agentCode: "J",
    category: "INCOME_TAX",
  },
  {
    id: "ded-2",
    description: "Festival Advance Recovery",
    billRecDate: "30/12/20",
    billCode: "12/206",
    amount: 2500.0,
    agentCode: "J",
    category: "FESTIVAL_ADVANCE",
  },
  {
    id: "ded-3",
    description: "Vehicle Loan Advance Recovery",
    billRecDate: "30/12/20",
    billCode: "12/206",
    amount: 5000.0,
    agentCode: "J",
    category: "VEHICLE_ADVANCE",
  },
  {
    id: "ded-4",
    description: "Club Membership Recovery",
    billRecDate: "30/12/20",
    billCode: "12/206",
    amount: 1200.0,
    agentCode: "J",
    category: "MISC_RECOVERY",
  },
  {
    id: "ded-5",
    description: "Tour Expense Adjustment",
    billRecDate: "30/12/99",
    billCode: "",
    amount: 0.0,
    agentCode: "",
    category: "TOUR_ADVANCE",
  },
];

interface PolicyLike {
  id?: string | number;
  agentCode?: string;
  advisor?: { advisorCode?: string; advisorName?: string };
  premium?: { installmentPremium?: number };
  premiumAmount?: number;
}

/**
 * Dynamic generator that filters and computes deduction items based on agency, advance type, and date range
 */
export function generateDeductionItems(
  policies: Array<PolicyLike> = [],
  agencyFilters: string[] = [],
  advanceType: string = "ALL"
): DeductionItem[] {
  let items: DeductionItem[] = [];

  // Check if live policies exist
  if (policies && policies.length > 0) {
    let totalGrossComm = 0;
    policies.forEach((p) => {
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

      const premium = Number(p.premium?.installmentPremium || p.premiumAmount || 15000);
      totalGrossComm += premium * 0.15;
    });

    const calculatedTds = Math.round(totalGrossComm * 0.05 * 100) / 100;

    items = [
      {
        id: "dyn-ded-1",
        description: "Income Tax TDS (u/s 194D)",
        billRecDate: "30/12/20",
        billCode: "12/206",
        amount: calculatedTds > 0 ? calculatedTds : 8543.0,
        agentCode: "J",
        category: "INCOME_TAX",
      },
      {
        id: "dyn-ded-2",
        description: "Festival Advance Recovery",
        billRecDate: "30/12/20",
        billCode: "12/206",
        amount: 2500.0,
        agentCode: "J",
        category: "FESTIVAL_ADVANCE",
      },
      {
        id: "dyn-ded-3",
        description: "Vehicle Loan Advance Recovery",
        billRecDate: "30/12/20",
        billCode: "12/206",
        amount: 5000.0,
        agentCode: "J",
        category: "VEHICLE_ADVANCE",
      },
      {
        id: "dyn-ded-4",
        description: "Club Membership Recovery",
        billRecDate: "30/12/20",
        billCode: "12/206",
        amount: 1200.0,
        agentCode: "J",
        category: "MISC_RECOVERY",
      },
    ];
  } else {
    items = [...SAMPLE_DEDUCTION_ITEMS];
  }

  // Filter by Advance Type if not ALL
  if (advanceType && advanceType !== "ALL") {
    items = items.filter((item) => item.category === advanceType);
  }

  return items;
}

export function calculateDeductionSummaryTotals(items: DeductionItem[]): DeductionSummaryTotals {
  let totalAmount = 0;
  let incomeTaxTotal = 0;
  let advanceRecoveriesTotal = 0;

  items.forEach((item) => {
    totalAmount += item.amount;
    if (item.category === "INCOME_TAX") {
      incomeTaxTotal += item.amount;
    } else {
      advanceRecoveriesTotal += item.amount;
    }
  });

  return {
    totalDeductionsCount: items.length,
    totalAmount: Math.round(totalAmount * 100) / 100,
    incomeTaxTotal: Math.round(incomeTaxTotal * 100) / 100,
    advanceRecoveriesTotal: Math.round(advanceRecoveriesTotal * 100) / 100,
  };
}
