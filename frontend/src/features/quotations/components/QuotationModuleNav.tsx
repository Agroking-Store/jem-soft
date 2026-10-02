"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { FileText, ShieldCheck, TrendingUp } from "lucide-react";
import { Suspense } from "react";
import type { QuotationProductType } from "../types";

type ModuleTab = QuotationProductType;

const TABS: { key: ModuleTab; label: string; icon: typeof FileText; href: string }[] = [
  { key: "LIFE_GUARD", label: "Life Guard", icon: ShieldCheck, href: "/dashboard/quotations?product=LIFE_GUARD" },
  { key: "PROTECT_AND_EARN", label: "Protect & Earn", icon: FileText, href: "/dashboard/quotations?product=PROTECT_AND_EARN" },
  { key: "RETIRE_ENJOY_I", label: "Retire Enjoy I", icon: TrendingUp, href: "/dashboard/quotations?product=RETIRE_ENJOY_I" },
];

function resolveActiveTab(pathname: string, productParam: string | null): ModuleTab {
  if (productParam === "PROTECT_AND_EARN") return "PROTECT_AND_EARN";
  if (productParam === "RETIRE_ENJOY_I") return "RETIRE_ENJOY_I";
  return "LIFE_GUARD";
}

function QuotationModuleNavInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = resolveActiveTab(pathname, searchParams.get("product"));

  return (
    <nav
      aria-label="Quotation module navigation"
      className="inline-flex max-w-full bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100"
    >
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        {TABS.map(({ key, label, icon: Icon, href }) => {
          const isActive = activeTab === key;
          return (
            <Link
              key={key}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={`
                relative flex items-center gap-2 px-6 py-2.5 rounded-[14px]
                text-[14px] font-bold whitespace-nowrap
                transition-all duration-200 select-none
                ${
                  isActive
                    ? "bg-[#1877F2] text-white shadow-md shadow-blue-200"
                    : "text-slate-500 hover:text-[#1877F2] hover:bg-[#1877F2]/10"
                }
                cursor-pointer
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

export default function QuotationModuleNav() {
  return (
    <Suspense
      fallback={
        <div className="inline-block bg-white rounded-2xl shadow-sm border border-slate-100 p-1.5 h-[52px] w-[380px] max-w-full animate-pulse" />
      }
    >
      <QuotationModuleNavInner />
    </Suspense>
  );
}
