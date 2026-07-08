"use client";

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { User, Phone, Mail, Building2, Calendar } from "lucide-react";
import type { RootState } from "@/store/store";
import { CustomerPageHero, CustomerSectionCard } from "@/features/customers/components/CustomerUi";

export default function CustomerPortalPage() {
  const { portalCustomer } = useSelector((s: RootState) => s.customers);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-[#0B1220]" />
      </div>
    );
  }

  const joinedDate = portalCustomer?.createdAt
    ? new Date(portalCustomer.createdAt).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "—";

  return (
    <div className="space-y-6">
      <CustomerPageHero
        title={portalCustomer?.name || "Customer Portal"}
        subtitle={portalCustomer?.companyName || "Your account information at a glance."}
      />

      <CustomerSectionCard title="Your Profile" icon={User} subtitle="Your account information">
        <div className="grid grid-cols-1 gap-5 p-1 sm:grid-cols-2">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#B8873A]/10">
              <User size={18} className="text-[#B8873A]" />
            </div>
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wider text-slate-400">Full Name</p>
              <p className="font-semibold text-slate-900">{portalCustomer?.name || "—"}</p>
            </div>
          </div>

          {portalCustomer?.companyName && (
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                <Building2 size={18} className="text-slate-700" />
              </div>
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wider text-slate-400">Company</p>
                <p className="font-semibold text-slate-900">{portalCustomer.companyName}</p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
              <Mail size={18} className="text-emerald-600" />
            </div>
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wider text-slate-400">Email</p>
              <p className="font-semibold text-slate-900">{portalCustomer?.email || "—"}</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50">
              <Phone size={18} className="text-amber-600" />
            </div>
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wider text-slate-400">Phone</p>
              <p className="font-semibold text-slate-900">{portalCustomer?.phone || "—"}</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">
              <Calendar size={18} className="text-slate-500" />
            </div>
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wider text-slate-400">Member Since</p>
              <p className="font-semibold text-slate-900">{joinedDate}</p>
            </div>
          </div>
        </div>
      </CustomerSectionCard>
    </div>
  );
}
