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
  Calendar
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
