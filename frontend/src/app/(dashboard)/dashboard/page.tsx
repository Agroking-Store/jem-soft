"use client";

import { useAuth } from "@/features/auth/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Users,
  Activity,
  DollarSign,
  Shield,
  Briefcase,
  MessageSquare,
  TrendingUp,
} from "lucide-react";

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
  }, []);



  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // For ADMIN and ADVISOR - show dashboard
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          Welcome back, {isMounted ? user?.name : "User"}! 👋
        </h1>
        <p className="text-slate-500">
          You are signed in as{" "}
          <span className="font-semibold text-blue-600 capitalize">
            {isMounted ? user?.role?.toLowerCase() : "..."}
          </span>
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Users</p>
              <p className="text-2xl font-bold text-slate-900">1,234</p>
              <p className="text-xs text-green-600 mt-1">↑ 12% this month</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Active Sessions</p>
              <p className="text-2xl font-bold text-slate-900">45</p>
              <p className="text-xs text-green-600 mt-1">↑ 8% this week</p>
            </div>
            <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
              <Activity className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Revenue</p>
              <p className="text-2xl font-bold text-slate-900">$12,430</p>
              <p className="text-xs text-green-600 mt-1">↑ 23% this month</p>
            </div>
            <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Conversion Rate</p>
              <p className="text-2xl font-bold text-slate-900">8.2%</p>
              <p className="text-xs text-green-600 mt-1">↑ 3% this month</p>
            </div>
            <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Role-specific panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {isMounted && user?.role === "ADMIN" && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-6 h-6 text-blue-600" />
              <h3 className="text-lg font-semibold text-slate-900">Admin Panel</h3>
            </div>
            <p className="text-slate-600 text-sm mb-4">
              You have full access to manage users, settings, and system configuration.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500">Total Admins</p>
                <p className="text-lg font-semibold text-slate-900">3</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500">System Status</p>
                <p className="text-lg font-semibold text-green-600">Online</p>
              </div>
            </div>
          </div>
        )}

        {isMounted && (user?.role === "ADVISOR" || user?.role === "VIEWER") && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <Briefcase className="w-6 h-6 text-green-600" />
              <h3 className="text-lg font-semibold text-slate-900">Advisor Panel</h3>
            </div>
            <p className="text-slate-600 text-sm mb-4">
              Manage your customers, appointments, and track your performance.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500">Active Customers</p>
                <p className="text-lg font-semibold text-slate-900">12</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500">Todays Appointments</p>
                <p className="text-lg font-semibold text-slate-900">3</p>
              </div>
            </div>
          </div>
        )}

        {/* Recent Activity */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-slate-400" />
              <h3 className="text-lg font-semibold text-slate-900">Recent Activity</h3>
            </div>
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              View All
            </button>
          </div>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
              <div>
                <p className="text-sm text-slate-700">New user registered</p>
                <p className="text-xs text-slate-400">2 minutes ago</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
              <div>
                <p className="text-sm text-slate-700">Appointment scheduled</p>
                <p className="text-xs text-slate-400">15 minutes ago</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
              <div>
                <p className="text-sm text-slate-700">Document uploaded</p>
                <p className="text-xs text-slate-400">1 hour ago</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}