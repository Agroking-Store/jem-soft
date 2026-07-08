"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import type { RootState, AppDispatch } from "@/store/store";
import { logoutPortalCustomer } from "@/features/customers/customerSlice";
import { LogOut, User } from "lucide-react";
import toast from "react-hot-toast";

export default function CustomerPortalLayout({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { portalCustomer, portalToken } = useSelector((s: RootState) => s.customers);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    if (isMounted && !portalToken) {
      router.push("/login");
    }
  }, [isMounted, portalToken, router]);

  const handleLogout = () => {
    dispatch(logoutPortalCustomer());
    toast.success("Logged out successfully");
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-[#0B1220] p-1.5 rounded-lg">
            <div className="w-6 h-6 bg-white rounded flex items-center justify-center text-[#B8873A] font-bold italic text-xs">
              JEM
            </div>
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900 uppercase">
            Jem Soft
          </span>
          <span className="ml-2 text-xs bg-[#E8C77A]/20 text-[#0B1220] px-2 py-0.5 rounded-full font-medium">
            Customer Portal
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50">
            <div className="w-8 h-8 rounded-full bg-[#E8C77A]/20 flex items-center justify-center">
              <User size={16} className="text-[#B8873A]" />
            </div>
            {isMounted && (
              <div className="hidden sm:flex flex-col">
                <span className="text-sm font-medium text-slate-900">{portalCustomer?.name}</span>
                <span className="text-xs text-slate-500">{portalCustomer?.email}</span>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 rounded-lg transition-colors font-medium"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {children}
      </main>
    </div>
  );
}
