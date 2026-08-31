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
 */

type ModuleTab = "policies" | "reports" | "comm-reports";

const TABS: { key: ModuleTab; label: string; icon: typeof FileText; href: string }[] = [
  { key: "policies", label: "Policies", icon: FileText, href: "/dashboard/lic" },
  { key: "reports",  label: "LIC Reports", icon: BarChart3, href: "/dashboard/lic/reports" },
  { key: "comm-reports", label: "LIC Comm. Reports", icon: FileText, href: "/dashboard/lic/comm-reports" },
];

function resolveActiveTab(pathname: string): ModuleTab {
  if (pathname.includes("/lic/comm-reports")) return "comm-reports";
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
export default function LicModuleNav() {
  return (
    <Suspense
      fallback={
        <div className="inline-block bg-[#0B1220] rounded-2xl shadow-lg shadow-[#0B1220]/20 p-1 h-[48px] w-[280px] max-w-full animate-pulse" />
      }
    >
      <LicModuleNavInner />
    </Suspense>
  );
}

