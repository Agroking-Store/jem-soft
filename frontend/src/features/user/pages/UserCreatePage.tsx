"use client";

import Link from "next/link";
import { ChevronRight, UserPlus } from "lucide-react";
import UserForm from "@/features/user/components/UserForm";

export default function UserCreatePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-8">
      <nav className="flex items-center gap-2 text-sm text-slate-500">
        <Link
          href="/dashboard"
          className="hover:text-slate-700 transition-colors"
        >
          Dashboard
        </Link>
        <ChevronRight size={14} />
        <Link
          href="/dashboard/users"
          className="hover:text-slate-700 transition-colors"
        >
          User Management
        </Link>
        <ChevronRight size={14} />
        <span className="font-medium text-slate-900">New User</span>
      </nav>

      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0B1220] via-[#132342] to-[#16294D] px-8 py-8">
        <div className="relative z-10 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#E8C77A]/10 ring-1 ring-[#E8C77A]/20">
            <UserPlus className="h-6 w-6 text-[#E8C77A]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Add New User</h1>
            <p className="mt-0.5 text-sm text-slate-400">
              Create a new system user and assign their role
            </p>
          </div>
        </div>
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/[0.03]" />
        <div className="absolute -bottom-6 right-20 h-24 w-24 rounded-full bg-white/[0.03]" />
      </div>

      <UserForm mode="create" />
    </div>
  );
}
