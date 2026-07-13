
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  ShieldCheck,
  TrendingUp,
  Settings,
  LogOut,
  User,
  Calendar,
  FileText,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  Users,
  Building2,
  UserCog,
  FileSpreadsheet,
  PlusCircle,
  List,
  Landmark,
} from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";



// AdminDropdown component - Only for ADMIN users
const AdminDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const adminItems = [
    { name: "User Management", href: "/dashboard/users", icon: Users },
    { name: "Organization", href: "/dashboard/organization", icon: Building2 },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
    { name: "My Account", href: "/dashboard/account", icon: UserCog },
  ];

  const isAdminActive = adminItems.some(item => pathname === item.href);

  return (
    <div className="space-y-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center justify-between w-full px-4 py-3 rounded-xl text-sm font-medium transition-all
          ${isAdminActive || isOpen
            ? "bg-blue-50 text-blue-700"
            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          }
        `}
      >
        <div className="flex items-center gap-3">
          <ShieldCheck size={20} />
          <span>User Management</span>
        </div>
        {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
      </button>

      {isOpen && (
        <div className="ml-4 space-y-1 border-l-2 border-slate-200 pl-2">
          {adminItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all
                  ${isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  }
                `}
              >
                <item.icon size={16} />
                {item.name}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

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

  // Navigation items for all logged-in users
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
          const isActive = item.href === "/dashboard"
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

        {/* LIC Link - Show for all users */}
        {isMounted && (isAdmin || isAdvisor || isViewer) && (() => {
          const licPath = "/dashboard/lic/policies";
          const isLicActive = pathname.startsWith(licPath);

          return (
            <Link
              href={licPath}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all
                ${isLicActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
            >
              <FileText size={20} />
              LIC
            </Link>
          );
        })()}

        {/* User Management section - Only show for ADMIN users */}
        {isMounted && isAdmin && <AdminDropdown />}
      </nav>
    </aside>
  );
};

