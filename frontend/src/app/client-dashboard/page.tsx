"use client";

import { useAuth } from "@/features/auth/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Calendar, FileText, MessageSquare, User, Clock, CheckCircle } from "lucide-react";

export default function ClientDashboardPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    // If user is not CLIENT, redirect to main dashboard
    if (!isLoading && user && user.role !== "CLIENT") {
      router.push("/dashboard");
    }
  }, [user, isLoading, router]);

  if (isLoading || !isMounted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Welcome Section */}
      <div className="bg-linear-to-r from-blue-600 to-blue-700 rounded-2xl p-8 mb-8 text-white">
        <h1 
          className="text-3xl font-bold mb-2"
          suppressHydrationWarning
        >
          Welcome back, {user?.name}! 👋
        </h1>
        <p 
          className="text-blue-100"
          suppressHydrationWarning
        >
          You are signed in as a <span className="font-semibold">Client</span>
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all cursor-pointer group">
          <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mb-3 group-hover:bg-blue-100 transition">
            <Calendar className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="font-semibold text-slate-900">Book Appointment</h3>
          <p className="text-sm text-slate-500">Schedule a meeting</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all cursor-pointer group">
          <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center mb-3 group-hover:bg-green-100 transition">
            <FileText className="w-6 h-6 text-green-600" />
          </div>
          <h3 className="font-semibold text-slate-900">View Documents</h3>
          <p className="text-sm text-slate-500">Access your files</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all cursor-pointer group">
          <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center mb-3 group-hover:bg-purple-100 transition">
            <MessageSquare className="w-6 h-6 text-purple-600" />
          </div>
          <h3 className="font-semibold text-slate-900">Send Message</h3>
          <p className="text-sm text-slate-500">Contact your advisor</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all cursor-pointer group">
          <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center mb-3 group-hover:bg-orange-100 transition">
            <User className="w-6 h-6 text-orange-600" />
          </div>
          <h3 className="font-semibold text-slate-900">Update Profile</h3>
          <p className="text-sm text-slate-500">Manage your account</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Upcoming Appointments</p>
              <p className="text-2xl font-bold text-slate-900">2</p>
            </div>
            <Clock className="w-5 h-5 text-blue-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Documents</p>
              <p className="text-2xl font-bold text-slate-900">3</p>
            </div>
            <FileText className="w-5 h-5 text-green-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Messages</p>
              <p className="text-2xl font-bold text-slate-900">5</p>
            </div>
            <MessageSquare className="w-5 h-5 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Recent Activity
        </h2>
        <div className="space-y-4">
          <div className="flex items-start gap-3 pb-3 border-b border-slate-100">
            <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
            <div>
              <p className="text-sm text-slate-700">Appointment scheduled for tomorrow</p>
              <p className="text-xs text-slate-400">2 hours ago</p>
            </div>
          </div>
          <div className="flex items-start gap-3 pb-3 border-b border-slate-100">
            <CheckCircle className="w-5 h-5 text-blue-500 mt-0.5" />
            <div>
              <p className="text-sm text-slate-700">Document uploaded successfully</p>
              <p className="text-xs text-slate-400">5 hours ago</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
            <div>
              <p className="text-sm text-slate-700">Profile updated</p>
              <p className="text-xs text-slate-400">1 day ago</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}