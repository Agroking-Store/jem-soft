"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import {
  Calculator,
  FileText,
  Landmark,
  LayoutDashboard,
  Megaphone,
  RotateCw,
  ShieldCheck,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const subscribeToHydration = () => () => {};
const getClientHydrationState = () => true;
const getServerHydrationState = () => false;

export const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const pathname = usePathname();
  const { user } = useAuth();
  const isHydrated = useSyncExternalStore(
    subscribeToHydration,
    getClientHydrationState,
    getServerHydrationState
  );
  const hasDashboardAccess = isHydrated && ["ADMIN", "ADVISOR", "VIEWER"].includes(
    user?.role ?? ""
  );

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Customers", href: "/dashboard/customers", icon: Users },
    ...(hasDashboardAccess
      ? [{ name: "LIC", href: "/dashboard/lic", icon: FileText }]
      : []),
    {
      name: "Premium Payments",
      href: "/dashboard/premium-payments",
      icon: WalletCards,
    },
    { name: "Claims", href: "/dashboard/claims", icon: ShieldCheck },
    { name: "Loans", href: "/dashboard/loans", icon: Landmark },
    {
      name: "Marketing & Alerts",
      href: "/dashboard/marketing",
      icon: Megaphone,
    },
    { name: "Pre-Sales Tools", href: "/dashboard/pre-sales", icon: Calculator },
    ...(hasDashboardAccess
      ? [{ name: "Policy 360", href: "/dashboard/policy-360", icon: RotateCw }]
      : []),
    ...(isHydrated && user?.role === "ADMIN"
      ? [{ name: "User Management", href: "/dashboard/users", icon: Users }]
      : []),
  ];

  return (
    <aside
      id="primary-navigation"
      aria-label="Primary navigation"
      className={`fixed inset-y-0 left-0 z-50 flex w-72 -translate-x-full flex-col border-r border-slate-200 bg-white shadow-2xl shadow-slate-950/10 transition-transform duration-200 ease-out lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:shrink-0 lg:translate-x-0 lg:shadow-none ${
        isOpen ? "translate-x-0" : ""
      }`}
    >
      <div className="flex items-center justify-between px-5 py-5 lg:px-6 lg:py-6">
        <Link
          href="/dashboard"
          onClick={onClose}
          className="flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-xs font-bold italic text-white shadow-sm">
            JEM
          </span>
          <span className="text-xl font-bold tracking-tight text-slate-900">JEM Soft</span>
        </Link>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 lg:hidden"
          aria-label="Close navigation"
        >
          <X size={20} aria-hidden="true" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-5" aria-label="Main menu">
        {navItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === item.href
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              aria-current={isActive ? "page" : undefined}
              className={`flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <item.icon size={19} aria-hidden="true" className="shrink-0" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};
