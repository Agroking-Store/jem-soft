"use client";

import { useAuth } from "@/features/auth/hooks/useAuth";
import { LogOut, User, Bell } from "lucide-react";
import { useState, useEffect } from "react";

export const Header = () => {
  const { user, logout } = useAuth();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Determine page title based on role and path
  const getPageTitle = () => {
    if (!isMounted) return "Loading...";
    if (user?.role === "CLIENT") return "Client Portal";
    return "Dashboard";
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between">
      <h1 
        className="text-xl font-semibold text-slate-900"
        suppressHydrationWarning
      >
        {getPageTitle()}
      </h1>

      <div className="flex items-center gap-4">
        <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition">
          <Bell size={20} />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <User size={16} className="text-blue-600" />
            </div>
            <div className="hidden sm:flex flex-col">
              <span 
                className="text-sm font-medium text-slate-900"
                suppressHydrationWarning
              >
                {isMounted ? user?.name || "User" : "Loading..."}
              </span>
              <span 
                className="text-xs text-slate-500 capitalize"
                suppressHydrationWarning
              >
                {isMounted ? user?.role?.toLowerCase() || "guest" : "..."}
              </span>
            </div>
          </div>

          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-red-600 transition-colors duration-200 px-3 py-1.5 hover:bg-red-50 rounded-lg"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};