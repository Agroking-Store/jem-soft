"use client";

import { useAuth } from "@/features/auth/hooks/useAuth";
import NotificationBell from "@/features/notifications/components/NotificationBell";
import Link from "next/link";
import { 
  LogOut, 
  User, 
  Bell, 
  ChevronDown,
  Ticket,
  UserCog,
  FileText,
  Video,
  Calendar,
  Phone,
  Mail,
  Building2
} from "lucide-react";
import { useState, useEffect, useRef } from "react";

export const Header = () => {
  const { user, logout } = useAuth();
  const [isMounted, setIsMounted] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isAdmin = user?.role === "ADMIN";

  // Determine page title based on role and path
  const getPageTitle = () => {
    if (!isMounted) return "Loading...";
    if (isAdmin) return "Admin Dashboard";
    return "Dashboard";
  };

  // Handle logout
  const handleLogout = () => {
    setIsProfileOpen(false);
    logout();
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
        {/* Notification Bell - Always rendered but hidden for customers */}
        <div className={isMounted && isAdmin ? "block" : "hidden"}>
          <NotificationBell />
        </div>

        {/* User Profile Section */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-lg transition-all
              ${isProfileOpen ? 'bg-slate-100' : 'hover:bg-slate-50'}
            `}
          >
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <User size={16} className="text-blue-600" />
            </div>
            <div className="hidden sm:flex flex-col items-start">
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
            {isMounted && isAdmin && (
              <ChevronDown
                size={16}
                className={`text-slate-400 transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`}
              />
            )}
          </button>

          {/* Admin Profile Dropdown */}
          {isMounted && isProfileOpen && (
            <div className="absolute right-0 top-full mt-2 w-105 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden z-50">
              {/* Profile Header */}
              <Link href="/dashboard/profile" onClick={() => setIsProfileOpen(!isProfileOpen)}>
                <div  className="p-4 border-b border-slate-100 hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <User size={24} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{user?.name}</p>
                      <p className="text-sm text-slate-500">{user?.email}</p>
                      <p className="text-xs text-blue-600 font-medium capitalize">{user?.role}</p>
                    </div>
                  </div>
                </div>
              </Link>

              

              

              

              {/* Logout Button */}
              <div className="p-2 border-t border-slate-100">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={18} />
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