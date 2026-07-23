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
      className="inline-flex max-w-full bg-[#0B1220] rounded-2xl shadow-lg shadow-[#0B1220]/20 p-1"
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
                    ? "bg-gradient-to-r from-[#B8873A] to-[#D9AE63] text-[#0B1220] shadow-md shadow-black/30"
                    : "text-white/55 hover:text-white hover:bg-white/[0.07] active:bg-white/10"
                }
              `}
            >
              <Icon size={15} strokeWidth={isActive ? 2.6 : 2} />
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
        <div className="inline-block bg-[#0B1220] rounded-2xl shadow-lg shadow-[#0B1220]/20 p-1 h-[48px] w-[420px] max-w-full animate-pulse" />
      }
    >
      <CustomerModuleNavInner />
    </Suspense>
  );
}