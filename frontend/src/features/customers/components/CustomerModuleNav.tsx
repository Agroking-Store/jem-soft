"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Users, UserCog } from "lucide-react";
import { Suspense } from "react";

/**
 * CustomerModuleNav
 * ------------------
 * A single, shared navigation bar for the entire Customer module.
 * Always visible on every customer-related page (List, Details, Edit, Create).
 * Wrapped in Suspense so useSearchParams() never blocks server rendering.
 *
 * Family History and Medical History now live INSIDE the Member Details modal,
 * so they are intentionally NOT top-level tabs here.
 */

type ModuleTab = "group" | "master";

const TABS: { key: ModuleTab; label: string; icon: typeof Users; href: string }[] = [
  { key: "group",   label: "Customer Group",  icon: Users,   href: "/dashboard/customers" },
  { key: "master",  label: "Customer Master", icon: UserCog, href: "/dashboard/customers?tab=master" },
];

function resolveActiveTab(pathname: string, tabParam: string | null): ModuleTab {
  if (pathname.includes("/customers/master")) return "master";
  if (tabParam === "master") return "master";
  return "group";
}

/** Inner component that uses useSearchParams (must be in Suspense) */
function CustomerModuleNavInner() {
  const pathname    = usePathname();
  const searchParams = useSearchParams();
  const activeTab   = resolveActiveTab(pathname, searchParams.get("tab"));

  return (
    <nav
      aria-label="Customer module navigation"
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

/** Public export — always wraps inner in Suspense so it's safe anywhere */
export default function CustomerModuleNav() {
  return (
    <Suspense
      fallback={
        <div className="inline-block bg-white rounded-2xl shadow-sm border border-slate-100 p-1.5 h-[52px] w-[380px] max-w-full animate-pulse" />
      }
    >
      <CustomerModuleNavInner />
    </Suspense>
  );
}