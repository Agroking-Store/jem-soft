"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, BarChart3, AlertCircle } from "lucide-react";
import { Suspense, useMemo } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "@/store/store";
import { getBiMonthlyCycles } from "./comm-reports/fortnightTracker";

/**
 * LicModuleNav
 * ------------------
 * A shared navigation bar for the LIC module.
 * Contains "Policies", "LIC Reports", and "LIC Comm. Reports" tabs.
 * Styled with the JEM Soft blue/white theme (#1877F2 primary).
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
  const { bills } = useSelector((state: RootState) => state.commissions);

  // Check if any recent bi-monthly statement is missing
  const { hasPendingStatements } = useMemo(() => {
    return getBiMonthlyCycles(bills || [], 2);
  }, [bills]);

  return (
    <nav
      aria-label="LIC module navigation"
      className="inline-flex max-w-full bg-white rounded-2xl shadow-sm border border-slate-100 p-1"
    >
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
        {TABS.map(({ key, label, icon: Icon, href }) => {
          const isActive = activeTab === key;
          const showPendingAlert = key === "comm-reports" && hasPendingStatements;

          return (
            <Link
              key={key}
              href={href}
              onClick={() => {
                if (key === "comm-reports" && typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("reset-comm-reports-view"));
                }
              }}
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

              {showPendingAlert && (
                <span
                  title="Bi-monthly commission statement PDF pending upload"
                  className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
                    isActive
                      ? "bg-amber-300 text-amber-950 font-black"
                      : "bg-amber-100 text-amber-800 border border-amber-300/80 animate-pulse"
                  }`}
                >
                  <AlertCircle size={10} />
                  <span>Pending</span>
                </span>
              )}
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

