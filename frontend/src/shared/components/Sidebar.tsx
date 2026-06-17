"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import {
  LayoutDashboard,
  ShieldCheck,
  TrendingUp,
  Settings,
  LogOut,
  User,
} from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";

const UserProfile = () => {
  const { logout, user } = useAuth();

  return (
    <div className="p-4 border-t border-slate-800 space-y-2">
      <div className="flex items-center gap-3 px-4 py-3 text-gray-400">
        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center shrink-0">
          <User size={18} />
        </div>
        <div className="flex flex-col overflow-hidden">
          <span className="text-xs font-bold text-white truncate w-32">
            {user?.name || "User Account"}
          </span>
        </div>
      </div>

      <button
        onClick={logout}
        className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all"
      >
        <LogOut size={20} />
        Logout
      </button>
    </div>
  );
};

const DynamicUserProfile = dynamic(() => Promise.resolve(UserProfile), {
  ssr: false,
  loading: () => (
    <div className="p-4 border-t border-slate-800 h-24 animate-pulse bg-slate-900/50" />
  ),
});

export const Sidebar = () => {
  const pathname = usePathname();

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  ];

  return (
    <aside className="w-64 bg-card border-r border-slate-800 flex flex-col min-h-screen">
      <div className="p-6 flex items-center gap-3">
        <div className="bg-white p-1.5 rounded-lg">
          <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center text-white font-bold italic text-xs">
            JEM
          </div>
        </div>
        <span className="text-xl font-bold tracking-tight text-white uppercase">
          Jem Soft
        </span>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all
                ${
                  isActive
                    ? "bg-brand-blue text-slate-900 shadow-[0_0_20px_rgba(180,198,252,0.3)]"
                    : "text-gray-400 hover:bg-slate-800 hover:text-white"
                }
              `}
            >
              <item.icon size={20} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <DynamicUserProfile />
    </aside>
  );
};
