"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, LogOut, Menu, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import NotificationBell from "@/features/notifications/components/NotificationBell";

interface HeaderProps {
  isNavigationOpen: boolean;
  onMenuToggle: () => void;
}

const PAGE_TITLES: Array<{ match: string; title: string }> = [
  { match: "/dashboard/customers", title: "Customers" },
  { match: "/dashboard/lic", title: "LIC" },
  { match: "/dashboard/premium-payments", title: "Premium Payments" },
  { match: "/dashboard/claims", title: "Claims" },
  { match: "/dashboard/loans", title: "Loans" },
  { match: "/dashboard/marketing", title: "Marketing & Alerts" },
  { match: "/dashboard/pre-sales", title: "Pre-Sales Tools" },
  { match: "/dashboard/policy-360", title: "Policy 360" },
  { match: "/dashboard/users", title: "User Management" },
  { match: "/dashboard/notifications", title: "Notifications" },
  { match: "/dashboard/profile", title: "My Profile" },
  { match: "/dashboard/organization", title: "Organization" },
];

const getPageTitle = (pathname: string) =>
  PAGE_TITLES.find(({ match }) => pathname.startsWith(match))?.title ?? "Dashboard";

export const Header = ({ isNavigationOpen, onMenuToggle }: HeaderProps) => {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pageTitle = getPageTitle(pathname);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    setIsProfileOpen(false);
    logout();
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={onMenuToggle}
          className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 lg:hidden"
          aria-label={isNavigationOpen ? "Close navigation" : "Open navigation"}
          aria-controls="primary-navigation"
          aria-expanded={isNavigationOpen}
        >
          <Menu size={21} aria-hidden="true" />
        </button>
        <h1 className="truncate text-lg font-semibold text-slate-900 sm:text-xl">{pageTitle}</h1>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <NotificationBell />

        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsProfileOpen((isOpen) => !isOpen)}
            className={`flex items-center gap-2 rounded-lg p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 sm:px-3 sm:py-2 ${
              isProfileOpen ? "bg-slate-100" : "hover:bg-slate-50"
            }`}
            aria-label="Open account menu"
            aria-haspopup="menu"
            aria-controls="account-menu"
            aria-expanded={isProfileOpen}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
              <User size={16} className="text-blue-600" aria-hidden="true" />
            </span>
            <span className="hidden min-w-0 sm:flex sm:flex-col sm:items-start">
              <span className="max-w-32 truncate text-sm font-medium text-slate-900">
                {user?.name || "User"}
              </span>
              <span className="text-xs capitalize text-slate-500">
                {user?.role?.toLowerCase() || "Guest"}
              </span>
            </span>
            <ChevronDown
              size={16}
              aria-hidden="true"
              className={`hidden text-slate-400 transition-transform sm:block ${
                isProfileOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {isProfileOpen && (
            <div
              id="account-menu"
              role="menu"
              aria-label="Account menu"
              className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-950/10"
            >
              <Link
                href="/dashboard/profile"
                role="menuitem"
                onClick={() => setIsProfileOpen(false)}
                className="block border-b border-slate-100 p-4 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600"
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100">
                    <User size={21} className="text-blue-600" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-slate-900">{user?.name || "User"}</span>
                    <span className="block truncate text-sm text-slate-500">{user?.email}</span>
                    <span className="block text-xs font-medium capitalize text-blue-600">{user?.role?.toLowerCase()}</span>
                  </span>
                </span>
              </Link>
              <div className="p-2">
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-rose-600 transition-colors hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600"
                >
                  <LogOut size={18} aria-hidden="true" />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
