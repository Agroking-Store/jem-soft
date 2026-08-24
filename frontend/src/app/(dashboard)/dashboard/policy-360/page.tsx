import Link from "next/link";
import { ArrowRight, Clock3, Search } from "lucide-react";
import { CustomerPageHero } from "@/features/customers/components/CustomerUi";
import { FileClock } from "lucide-react";

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
    <div className="mx-auto max-w-7xl space-y-6">
      <CustomerPageHero
        title="Policy 360"
        subtitle="Complete policy monitoring and management"
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {cards.map(({ title, subtitle, href, icon: Icon, iconClass }) => (
          <Link
            key={href}
            href={href}
            className="group relative flex min-h-56 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(15,23,42,0.09)]"
          >
            <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#B8873A]/40 to-transparent" />
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconClass}`}
            >
              <Icon size={20} />
            </div>
            <div className="mt-auto pt-8">
              <h2 className="font-serif text-lg font-semibold text-slate-900">
                {title}
              </h2>
              <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
            </div>
            <ArrowRight
              className="mt-5 self-end text-[#B8873A] transition-transform group-hover:translate-x-1"
              size={20}
            />
          </Link>
        ))}
      </div>
    </div>
  );
}
