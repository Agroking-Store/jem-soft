import Link from "next/link";
import { ArrowRight, Clock3, Search , FileClock } from "lucide-react";

const cards = [
  {
    title: "Premium Due",
    subtitle: "Premium due for next 30 days",
    href: "/dashboard/policy-360/premiumDue",
    icon: FileClock,
    iconClass: "bg-rose-50 text-rose-600",
  },
  {
    title: "Lapsed Policies",
    subtitle: "Premium unpaid for last 90 days",
    href: "/dashboard/policy-360/lapsed",
    icon: Clock3,
    iconClass: "bg-rose-50 text-rose-600",
  },
  {
    title: "Search Policies",
    subtitle: "By Policy, Name, Mobile...",
    href: "/dashboard/policy-360/search",
    icon: Search,
    iconClass: "bg-blue-50 text-blue-600",
  },
];

export default function Policy360Page() {
  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Policy 360</h1>
        <p className="mt-2 text-slate-500">
          View and manage lapsed policies or search policy information.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {cards.map(({ title, subtitle, href, icon: Icon, iconClass }) => (
          <Link
            key={href}
            href={href}
            className="group flex min-h-56 flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg"
          >
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-xl ${iconClass}`}
            >
              <Icon size={24} />
            </div>
            <div className="mt-auto pt-8">
              <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
              <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
            </div>
            <ArrowRight
              className="mt-5 self-end text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-slate-700"
              size={20}
            />
          </Link>
        ))}
      </div>
    </div>
  );
}
