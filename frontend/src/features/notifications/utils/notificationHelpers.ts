import { 
  FileText, 
  CreditCard, 
  AlertTriangle, 
  ShieldCheck, 
  Trash2, 
  Bell, 
  CheckCircle2, 
  Clock, 
  Info,
  Calendar,
  Landmark
} from "lucide-react";

export function formatYouTubeTime(dateInput: string | Date | undefined): string {
  if (!dateInput) return "";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "";

  const now = new Date();
  const diffInSeconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));

  if (diffInSeconds < 45) return "Just now";
  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes === 1) return "1 minute ago";
  if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours === 1) return "1 hour ago";
  if (diffInHours < 24) return `${diffInHours} hours ago`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return "Yesterday";
  if (diffInDays < 7) return `${diffInDays} days ago`;

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks === 1) return "1 week ago";
  if (diffInWeeks < 5) return `${diffInWeeks} weeks ago`;

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths === 1) return "1 month ago";
  if (diffInMonths < 12) return `${diffInMonths} months ago`;

  const diffInYears = Math.floor(diffInDays / 365);
  if (diffInYears === 1) return "1 year ago";
  return `${diffInYears} years ago`;
}

export interface NotificationMeta {
  icon: any;
  iconBg: string;
  iconColor: string;
  badgeLabel: string;
  badgeBg: string;
  badgeColor: string;
}

export function getNotificationMeta(type?: string, title?: string): NotificationMeta {
  const normalizedType = (type || "").toUpperCase();
  const normalizedTitle = (title || "").toUpperCase();

  if (normalizedType.includes("LOAN") || normalizedTitle.includes("LOAN")) {
    return {
      icon: Landmark,
      iconBg: "bg-amber-100",
      iconColor: "text-amber-700",
      badgeLabel: "LOAN",
      badgeBg: "bg-amber-600",
      badgeColor: "text-white",
    };
  }

  if (normalizedType.includes("PAID") || normalizedTitle.includes("PAID") || normalizedTitle.includes("PAYMENT RECEIVED")) {
    return {
      icon: CreditCard,
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
      badgeLabel: "PAID",
      badgeBg: "bg-emerald-500",
      badgeColor: "text-white",
    };
  }

  if (normalizedType.includes("DUE") || normalizedTitle.includes("DUE") || normalizedTitle.includes("UPCOMING")) {
    return {
      icon: Clock,
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
      badgeLabel: "DUE",
      badgeBg: "bg-amber-500",
      badgeColor: "text-white",
    };
  }

  if (normalizedType.includes("LAPSED") || normalizedTitle.includes("LAPSE") || normalizedType.includes("DELETED") || normalizedTitle.includes("DELETED")) {
    return {
      icon: AlertTriangle,
      iconBg: "bg-rose-100",
      iconColor: "text-rose-600",
      badgeLabel: "ALERT",
      badgeBg: "bg-rose-500",
      badgeColor: "text-white",
    };
  }

  if (normalizedType.includes("POLICY_CREATED") || normalizedTitle.includes("NEW POLICY") || normalizedTitle.includes("CREATED")) {
    return {
      icon: ShieldCheck,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      badgeLabel: "POLICY",
      badgeBg: "bg-blue-600",
      badgeColor: "text-white",
    };
  }

  if (normalizedType.includes("POLICY_UPDATED") || normalizedTitle.includes("UPDATED")) {
    return {
      icon: FileText,
      iconBg: "bg-indigo-100",
      iconColor: "text-indigo-600",
      badgeLabel: "UPDATE",
      badgeBg: "bg-indigo-600",
      badgeColor: "text-white",
    };
  }

  if (normalizedTitle.includes("BIRTHDAY") || normalizedTitle.includes("ANNIVERSARY")) {
    return {
      icon: Calendar,
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
      badgeLabel: "EVENT",
      badgeBg: "bg-purple-600",
      badgeColor: "text-white",
    };
  }

  return {
    icon: Bell,
    iconBg: "bg-slate-100",
    iconColor: "text-slate-700",
    badgeLabel: "LIC",
    badgeBg: "bg-slate-700",
    badgeColor: "text-white",
  };
}

export function extractPolicyNumber(title?: string, message?: string): string | null {
  const combined = `${title || ""} ${message || ""}`;

  // 1. Match "Policy 000000002" or "Policy: 000000002" or "Policy #000000002"
  const policyWordMatch = combined.match(/Policy[:\s#]+([A-Za-z0-9_-]+)/i);
  if (policyWordMatch && policyWordMatch[1]) {
    const val = policyWordMatch[1].trim();
    const lower = val.toLowerCase();
    if (
      !lower.startsWith("created") &&
      !lower.startsWith("updated") &&
      !lower.startsWith("deleted") &&
      !lower.startsWith("premium") &&
      !lower.startsWith("loan")
    ) {
      return val;
    }
  }

  // 2. Match "(123456789)" or "(HDFC-TEST-123)"
  const parenMatch = combined.match(/\(([A-Za-z0-9_-]+)\)/);
  if (
    parenMatch &&
    parenMatch[1] &&
    !parenMatch[1].toLowerCase().includes("monthly") &&
    !parenMatch[1].toLowerCase().includes("yearly") &&
    !parenMatch[1].toLowerCase().includes("quarterly") &&
    !parenMatch[1].toLowerCase().includes("daily")
  ) {
    return parenMatch[1].trim();
  }

  return null;
}

export function extractPaymentId(message?: string): string | null {
  if (!message) return null;
  const match = message.match(/\[paymentId:([a-f0-9-]+)\]/i);
  return match ? match[1] : null;
}

export function getNotificationTargetUrl(
  notification: {
    type?: string;
    title?: string;
    message?: string;
    policyId?: string | null;
  },
  resolvedPolicyId?: string | null
): string {
  const type = (notification.type || "").toUpperCase();
  const title = (notification.title || "").toLowerCase();
  const message = (notification.message || "").toLowerCase();
  const effectivePolicyId = resolvedPolicyId || notification.policyId;
  const extractedPaymentId = extractPaymentId(notification.message);

  // 1. Premium Paid / Updated -> directly to the Premium Payment View Form!
  if (
    type === "PREMIUM_PAID" ||
    type === "PREMIUM_UPDATED" ||
    title.includes("premium paid") ||
    title.includes("payment received") ||
    title.includes("premium updated")
  ) {
    if (extractedPaymentId) {
      return `/dashboard/premium-payments/${extractedPaymentId}`;
    }
    if (effectivePolicyId) {
      return `/dashboard/premium-payments/${effectivePolicyId}`;
    }
    return "/dashboard/premium-payments/new";
  }

  // 2. Premium Due Alert -> directly to the Premium Payment Form (create mode)!
  if (
    type === "PREMIUM_DUE" ||
    title.includes("due alert") ||
    title.includes("premium due") ||
    title.includes("upcoming premium") ||
    (title.includes("due") && title.includes("premium"))
  ) {
    if (effectivePolicyId) {
      return `/dashboard/premium-payments/new?policyId=${effectivePolicyId}`;
    }
    return "/dashboard/premium-payments/new";
  }

  // 3. Loans -> directly to Loan Form or Repayment Form!
  if (type.includes("LOAN") || title.includes("loan") || message.includes("loan")) {
    if (title.includes("repay") || message.includes("repay")) {
      return "/dashboard/loans/repay";
    }
    if (effectivePolicyId) {
      return `/dashboard/loans/new?policyId=${effectivePolicyId}`;
    }
    return "/dashboard/loans/new";
  }

  // 4. Claims -> directly to Claim Form!
  if (type.includes("CLAIM") || title.includes("claim") || message.includes("claim")) {
    if (effectivePolicyId) {
      return `/dashboard/claims/new?policyId=${effectivePolicyId}`;
    }
    return "/dashboard/claims/new";
  }

  // 5. Policy Created / Updated / General Policy -> directly to Policy View page!
  if (effectivePolicyId) {
    return `/dashboard/lic/policies/${effectivePolicyId}`;
  }

  // 6. Fallback for Premium Paid if no policyId found
  if (type.startsWith("PREMIUM_") || title.includes("premium")) {
    return "/dashboard/premium-payments/new";
  }

  // 7. Policy Deleted
  if (type === "POLICY_DELETED" || title.includes("policy deleted")) {
    return "/dashboard/lic/policies";
  }

  return "/dashboard/lic/policies";
}

export function getNotificationActionLabel(
  notification: {
    type?: string;
    title?: string;
    message?: string;
    policyId?: string | null;
  },
  resolvedPolicyId?: string | null
): string {
  const type = (notification.type || "").toUpperCase();
  const title = (notification.title || "").toLowerCase();
  const message = (notification.message || "").toLowerCase();

  if (
    type === "PREMIUM_PAID" ||
    type === "PREMIUM_UPDATED" ||
    title.includes("premium paid") ||
    title.includes("payment received")
  ) {
    return "View payment";
  }

  if (
    type === "PREMIUM_DUE" ||
    title.includes("due") ||
    message.includes("due")
  ) {
    return "Pay premium";
  }

  if (type.includes("LOAN") || title.includes("loan") || message.includes("loan")) {
    if (title.includes("repay") || message.includes("repay")) {
      return "Record repayment";
    }
    return "Apply loan";
  }

  if (type.includes("CLAIM") || title.includes("claim") || message.includes("claim")) {
    return "File claim";
  }

  return "View policy";
}


