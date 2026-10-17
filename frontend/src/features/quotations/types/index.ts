export type QuotationProductType = "LIFE_GUARD" | "PROTECT_AND_EARN" | "RETIRE_ENJOY_I";

export interface QuotationYearlyIllustration {
  policyYear: number;
  age: number;
  premium: number;
  cumulativePremium: number;
  normalCover: number;
  accidentalCover: number;
  surrenderValue: number;
  loanAvailable: number;
  cashFlowReturns: number;
}

export interface QuotationCalculationResult {
  productId?: string;
  planNumber?: string;
  rate?: number;
  tabularPremium?: number;
  basicPremium: number;
  gst: number;
  installmentPremium: number;
  totalInstallmentPremium: number;
  totalPremium: number;
  maturityAmount: number;
  bonusScenario: string;
  taxSavingsAmount: number;
  yearlyIllustration: QuotationYearlyIllustration[];
  summaryRow: {
    planText: string;
    sumAssured: number;
    basicPremium: number;
    gst: number;
    installmentPremium: number;
  };
}

export interface ReportOptionsState {
  coverPage: boolean;
  benefitsIllustration?: boolean;
  benefitsForecast?: boolean;
  agentsCopy: boolean;
  medicalRequirement: boolean;
  taxBreakup?: boolean;
  yield: boolean;
}

export interface Quotation {
  id: string;
  quotationRefNo: string;
  productType: QuotationProductType;
  quotationDate: string;
  commencementDate: string;
  customerId?: string | null;
  customer?: {
    id: string;
    name: string;
    groupCode?: string;
    email?: string;
    phone?: string;
  } | null;
  memberId?: string | null;
  member?: {
    id: string;
    firstName: string;
    lastName: string;
    gender?: string;
    dob?: string;
  } | null;
  groupCode?: string | null;
  title: string;
  proposerName: string;
  gender: string;
  dateOfBirth?: string | null;
  age: number;
  isSmoker: boolean;
  extraPremiumClass: string;
  sec80CLimit: number;
  taxSlabPercentage: number;
  bonusScenario: string;
  planId?: string | null;
  planNumber?: string | null;
  basis: string;
  budget: number;
  coverRequired?: number;
  premiumMode: string;
  policyTerm?: number | null;
  ppt?: number | null;
  sumAssured: number;
  basicPremium: number;
  gst: number;
  installmentPremium: number;
  totalPremium: number;
  maturityAmount?: number | null;
  calculationDetails?: QuotationCalculationResult | null;
  reportOptions?: ReportOptionsState;
  createdAt: string;
  updatedAt: string;
}

export interface QuotationState {
  quotations: Quotation[];
  currentQuotation: Quotation | null;
  calculationResult: QuotationCalculationResult | null;
  nextRefNo: string;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  isLoading: boolean;
  isCalculating: boolean;
  error: string | null;
}
