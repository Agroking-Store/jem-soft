"use client";

import { useSelector } from "react-redux";
import type { RootState } from "@/store/store";
import { useState, useEffect } from "react";
import { User, Phone, Mail, Building2, Calendar } from "lucide-react";

export default function CustomerPortalPage() {
  const { portalCustomer } = useSelector((s: RootState) => s.customers);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  if (!isMounted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  const joinedDate = portalCustomer?.createdAt
    ? new Date(portalCustomer.createdAt).toLocaleDateString("en-IN", {
        day: "2-digit", month: "long", year: "numeric",
      })
    : "—";

  return (
    <div>
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-8 mb-8 text-white shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <User size={30} className="text-white" />
          </div>
          <div>
            <p className="text-blue-100 text-sm font-medium mb-1">Welcome back 👋</p>
            <h1 className="text-3xl font-bold">{portalCustomer?.name}</h1>
            {portalCustomer?.companyName && (
              <p className="text-blue-200 mt-1 text-sm">{portalCustomer.companyName}</p>
            )}
          </div>
        </div>
      </div>

      {/* Profile Info Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">Your Profile</h2>
          <p className="text-sm text-slate-505">Your account information</p>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <User size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Full Name</p>
              <p className="text-slate-900 font-semibold">{portalCustomer?.name || "—"}</p>
            </div>
          </div>

          {portalCustomer?.companyName && (
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                <Building2 size={18} className="text-purple-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Company</p>
                <p className="text-slate-900 font-semibold">{portalCustomer.companyName}</p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
              <Mail size={18} className="text-green-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Email</p>
              <p className="text-slate-900 font-semibold">{portalCustomer?.email || "—"}</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
              <Phone size={18} className="text-orange-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Phone</p>
              <p className="text-slate-900 font-semibold">{portalCustomer?.phone || "—"}</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
              <Calendar size={18} className="text-slate-505" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Member Since</p>
              <p className="text-slate-900 font-semibold">{joinedDate}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
