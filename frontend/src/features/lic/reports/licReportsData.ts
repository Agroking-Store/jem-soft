import {
  FileText,
  ShieldCheck,
  Calendar,
  AlertCircle,
  Clock,
  Award,
  TrendingUp,
  BarChart3,
  FileSpreadsheet,
  Zap,
  Percent,
  Calculator,
  UserCheck,
  FileCheck,
  Briefcase,
  Layers,
  LucideIcon
} from "lucide-react";

export interface LicReportCard {
  id: string;
  title: string;
  category: "Register" | "Financial" | "Due & Statements" | "Calculators & Misc";
  description: string;
  icon: LucideIcon;
  isFeatured?: boolean;
  statusBadge?: string;
}

export const LIC_REPORT_CARDS: LicReportCard[] = [
  {
    id: "policy-register",
    title: "Policy Register",
    category: "Register",
    description: "Groupwise comprehensive listing of all active, paid-up, and lapsed policies with sum assured, FUP, and nominee details.",
    icon: FileText,
    isFeatured: true,
    statusBadge: "Featured Report",
  },
  {
    id: "current-status-register",
    title: "Current Status Register",
    category: "Register",
    description: "Real-time snapshot of policies categorized by Inforce, Reduced Paidup, Lapsed, Surrendered, or Matured status.",
    icon: ShieldCheck,
  },
  {
    id: "premium-due",
    title: "Premium Due",
    category: "Due & Statements",
    description: "Upcoming premium due schedules filtered by date range, payment mode, and agency code.",
    icon: Calendar,
    statusBadge: "Action Needed",
  },
  {
    id: "premium-outstanding",
    title: "Premium Outstanding",
    category: "Due & Statements",
    description: "Detailed list of unpaid overdue premiums past grace period with late fees calculation.",
    icon: AlertCircle,
  },
  {
    id: "lapsed-policy",
    title: "Lapsed Policy",
    category: "Register",
    description: "Register of lapsed policies eligible for revival along with revival quote details.",
    icon: Clock,
  },
  {
    id: "policy-maturity",
    title: "Policy Maturity",
    category: "Financial",
    description: "Maturity claims schedule listing policies maturing within chosen date range.",
    icon: Award,
  },
  {
    id: "survival-benefit",
    title: "Survival Benefit",
    category: "Financial",
    description: "Money-back and survival benefit due dates and payout tracking.",
    icon: TrendingUp,
  },
  {
    id: "cash-flow-chart",
    title: "Cash Flow Chart",
    category: "Financial",
    description: "Year-wise projected cash inflow (returns, maturity) vs cash outflow (premiums).",
    icon: BarChart3,
  },
  {
    id: "comprehensive-insurance-chart",
    title: "Comprehensive Insurance Chart",
    category: "Financial",
    description: "Visual portfolio chart showing total risk cover, accidental cover, and returns breakdown.",
    icon: Layers,
  },
  {
    id: "premium-paid-details",
    title: "Premium Paid Details",
    category: "Due & Statements",
    description: "Tax proof & premium paid certificate statement for income tax filing (80C).",
    icon: FileCheck,
  },
  {
    id: "annuity-statement",
    title: "Annuity Statement",
    category: "Due & Statements",
    description: "Pension payout statement for annuity policies detailing pension frequency and dates.",
    icon: Briefcase,
  },
  {
    id: "loan-interest-due",
    title: "Loan Interest Due",
    category: "Due & Statements",
    description: "Upcoming policy loan interest due dates and interest amount due.",
    icon: Percent,
  },
  {
    id: "loan-interest-outstanding",
    title: "Loan Interest Outstanding",
    category: "Due & Statements",
    description: "Overdue policy loan interest details with compounding penalty breakdown.",
    icon: Zap,
  },
  {
    id: "revival-premium-calculator",
    title: "Revival Premium Calculator",
    category: "Calculators & Misc",
    description: "Calculate late fee, GST, medical requirements, and total cost to revive lapsed policies.",
    icon: Calculator,
    statusBadge: "Tool",
  },
  {
    id: "premium-calender",
    title: "Premium Calender",
    category: "Due & Statements",
    description: "Month-by-month premium calendar showing total cash requirement per month.",
    icon: Calendar,
  },
  {
    id: "last-premium-statement",
    title: "Last Premium Statement",
    category: "Due & Statements",
    description: "Statement showing recent premium receipts, transactions, and payment mode history.",
    icon: FileSpreadsheet,
  },
  {
    id: "customer-data-sheet",
    title: "Customer Data Sheet",
    category: "Calculators & Misc",
    description: "Complete single-page master client summary including family profile, bank details, and policies.",
    icon: UserCheck,
  },
];
