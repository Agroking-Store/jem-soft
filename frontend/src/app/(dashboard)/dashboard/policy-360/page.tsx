import Link from "next/link";
import {
  ArrowRight,
  Clock3,
  RotateCw,
  Search,
  AlertTriangle,
} from "lucide-react";
import { FileClock } from "lucide-react";

const cards = [
  {
    title: "Premium Due",
    subtitle: "Next 30 Days",
    href: "/dashboard/policy-360/premiumDue",
    icon: FileClock,
    accent: "from-blue-500 via-blue-500/40",
    iconBg: "bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white",
  },
  {
    title: "Outstanding Premiums",
    subtitle: "Last 30 Days",
    href: "/dashboard/policy-360/outstanding",
    icon: AlertTriangle,
    accent: "from-amber-400 via-amber-400/40",
    iconBg: "bg-amber-50 text-amber-600 group-hover:bg-amber-500 group-hover:text-white",
  },
  {
    title: "Lapsed Policies",
    subtitle: "Last 90 Days",
    href: "/dashboard/policy-360/lapsed",
    icon: Clock3,
    accent: "from-rose-400 via-rose-400/40",
    iconBg: "bg-rose-50 text-rose-600 group-hover:bg-rose-500 group-hover:text-white",
  },
  {
    title: "Search Policies",
    subtitle: "By Policy, Name, Mobile...",
    href: "/dashboard/policy-360/search",
    icon: Search,
    accent: "from-[#1877F2] via-[#1877F2]/40",
    iconBg: "bg-blue-50 text-[#1877F2] group-hover:bg-[#1877F2] group-hover:text-white",
  },
];

export default function Policy360Page() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-8">
      {/* Header — Policy 360 module header */}
      <div className="mb-6 overflow-hidden rounded-2xl border border-blue-100 bg-[#f0f7ff] p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-[#1e3a8a] to-[#2563eb] text-white shadow-lg shadow-blue-200/50">
              <RotateCw size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">
                Policy 360
              </h1>
              <p className="mt-1 text-sm font-medium text-slate-500">
                Complete policy monitoring and management
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Compact option cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ title, subtitle, href, icon: Icon, accent, iconBg }) => (
          <Link
            key={href}
            href={href}
            className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
          >
            <div className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r ${accent} to-transparent`} />
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors duration-200 ${iconBg}`}>
              <Icon size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-bold tracking-tight text-[#0f172a]">
                {title}
              </h2>
              <p className="mt-0.5 truncate text-sm font-medium text-slate-500">
                {subtitle}
              </p>
            </div>
            <ArrowRight
              size={16}
              className="shrink-0 text-slate-400 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-[#1877F2]"
            />
          </Link>
        ))}
      </div>
    </div>
  );
}
