import {
  FileText,
  FileSpreadsheet,
  TrendingDown,
  PieChart,
  AlertCircle,
  Activity,
  Layers,
  LucideIcon
} from "lucide-react";

export interface CommReportCard {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  isFeatured?: boolean;
}

export const COMM_REPORT_CARDS: CommReportCard[] = [
  {
    id: "commission-ledger",
    title: "Commission Ledger",
    description: "Detailed ledger of commissions earned per policy across date ranges.",
    icon: FileText,
    isFeatured: true,
  },
  {
    id: "commission-bill",
    title: "Commission Bill",
    description: "Generate commission bills based on agency records.",
    icon: FileSpreadsheet,
  },
  {
    id: "deduction-summary",
    title: "Deduction Summary",
    description: "Summary of deductions applied to commissions over time.",
    icon: TrendingDown,
  },
  {
    id: "commission-summary",
    title: "Commission Summary",
    description: "Aggregated summary of total commission payouts.",
    icon: PieChart,
  },
  {
    id: "commission-outstanding",
    title: "Commission Outstanding",
    description: "List of outstanding commission payments not yet settled.",
    icon: AlertCircle,
  },
  {
    id: "short-excess-commissions",
    title: "Short/Excess Commissions",
    description: "Reconcile short or excess commissions detected in payouts.",
    icon: Activity,
  },
  {
    id: "gap-commissions",
    title: "Gap Commissions",
    description: "Track gaps in commission cycles and missing records.",
    icon: Layers,
  }
];
