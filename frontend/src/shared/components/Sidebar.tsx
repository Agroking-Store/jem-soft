"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  ShieldCheck,
  FileText,
  Users,
  Landmark,
} from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";

export const Sidebar = () => {
  const pathname = usePathname();
  const { user } = useAuth();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const isAdmin = user?.role === "ADMIN";
  const isAdvisor = user?.role === "ADVISOR";
  const isViewer = user?.role === "VIEWER";

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Customers", href: "/dashboard/customers", icon: Users },
    { name: "Claims", href: "/dashboard/claims", icon: ShieldCheck },
    { name: "Loans", href: "/dashboard/loans", icon: Landmark },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col min-h-screen">
      <div className="p-6 flex items-center gap-3">
        <div className="bg-blue-600 p-1.5 rounded-lg">
          <div className="w-6 h-6 bg-white rounded flex items-center justify-center text-blue-600 font-bold italic text-xs">
            JEM
          </div>
        </div>
        <span className="text-xl font-bold tracking-tight text-slate-900 uppercase">
          Jem Soft
        </span>
      </div>

      <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === item.href
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all
                ${
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }
              `}
            >
              <item.icon size={20} />
              {item.name}
            </Link>
          );
        })}

        {/* LIC Link */}
        {isMounted &&
          (isAdmin || isAdvisor || isViewer) &&
          (() => {
            const licPath = "/dashboard/lic";
            const isLicActive = pathname.startsWith(licPath);

            return (
              <Link
                href={licPath}
                className={`
                flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all
                ${
                  isLicActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <FileText size={20} />
                LIC
              </Link>
            );
          })()}

        {/* User Management - Admin only */}
        {isMounted && isAdmin && (
          <Link
            href="/dashboard/users"
            className={`
              flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all
              ${
                pathname.startsWith("/dashboard/users")
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }
            `}
          >
            <Users size={20} />
            User Management
          </Link>
        )}
      </nav>
    </aside>
  );
};
