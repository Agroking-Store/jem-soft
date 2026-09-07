"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, BarChart3 } from "lucide-react";
import { Suspense } from "react";

/**
 * LicModuleNav
 * ------------------
 * A shared navigation bar for the LIC module.
 * Contains "Policies" and "LIC Reports" tabs.
 * Styled with the JEM Soft blue/white theme (#1877F2 primary).
 */

type ModuleTab = "policies" | "reports";

const TABS: { key: ModuleTab; label: string; icon: typeof FileText; href: string }[] = [
  { key: "policies", label: "Policies", icon: FileText, href: "/dashboard/lic" },
  { key: "reports",  label: "LIC Reports", icon: BarChart3, href: "/dashboard/lic/reports" },
];

function resolveActiveTab(pathname: string): ModuleTab {
  if (pathname.includes("/lic/reports")) return "reports";
  return "policies";
}

/** Inner component that uses usePathname (must be in Suspense) */
function LicModuleNavInner() {
  const pathname  = usePathname();
  const activeTab = resolveActiveTab(pathname);

  return (
    <nav
      aria-label="LIC module navigation"
      className="inline-flex max-w-full bg-white rounded-2xl shadow-sm border border-slate-100 p-1"
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
                    ? "bg-[#1877F2] text-white shadow-md shadow-blue-200"
                    : "text-slate-500 hover:text-[#1877F2] hover:bg-[#1877F2]/10 active:bg-[#1877F2]/15"
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
export default function LicModuleNav() {
  return (
    <Suspense
      fallback={
        <div className="inline-block bg-white rounded-2xl shadow-sm border border-slate-100 p-1 h-[40px] w-[280px] max-w-full animate-pulse" />
      }
    >
      <LicModuleNavInner />
    </Suspense>
  );
}

