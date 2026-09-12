"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, TrendingUp, Calendar, GraduationCap } from "lucide-react";
import { Suspense } from "react";

type ModuleTab = "hlv" | "income-replacement" | "retirement-needs" | "child-education";

const TABS: { key: ModuleTab; label: string; icon: typeof Heart; href: string }[] = [
  { key: "hlv", label: "Human Life Value", icon: Heart, href: "/dashboard/pre-sales/hlv" },
  { key: "income-replacement", label: "Income Replacement", icon: TrendingUp, href: "/dashboard/pre-sales/income-replacement" },
  { key: "retirement-needs", label: "Retirement Needs", icon: Calendar, href: "/dashboard/pre-sales/retirement-needs" },
  { key: "child-education", label: "Child Education Needs", icon: GraduationCap, href: "/dashboard/pre-sales/child-education" },
];

function resolveActiveTab(pathname: string): ModuleTab {
  if (pathname.includes("/pre-sales/income-replacement")) return "income-replacement";
  if (pathname.includes("/pre-sales/retirement-needs")) return "retirement-needs";
  if (pathname.includes("/pre-sales/child-education")) return "child-education";
  return "hlv";
}

function PreSalesModuleNavInner() {
  const pathname = usePathname();
  const activeTab = resolveActiveTab(pathname);

  return (
    <nav
      aria-label="Pre-Sales module navigation"
      className="inline-flex max-w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-1.5"
    >
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
        {TABS.map(({ key, label, icon: Icon, href }) => {
          const isActive = activeTab === key;
          return (
            <Link
              key={key}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={`
                relative flex items-center gap-2 px-4 py-2 rounded-xl
                text-[13px] font-bold whitespace-nowrap
                transition-all duration-200 select-none
                ${
                  isActive
                    ? "bg-[#f0f7ff] text-[#1e3a8a] shadow-sm ring-1 ring-blue-100"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                }
              `}
            >
              <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
              <span className="tracking-tight">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default function PreSalesModuleNav() {
  return (
    <Suspense
      fallback={
        <div className="inline-block bg-white rounded-2xl shadow-sm border border-slate-200 p-1.5 h-[48px] w-[500px] max-w-full animate-pulse" />
      }
    >
      <PreSalesModuleNavInner />
    </Suspense>
  );
}
