"use client";

import Link from "next/link";
import { ChevronRight, ArrowLeft } from "lucide-react";
import UserForm from "@/features/user/components/UserForm";

export default function UserCreatePage() {
  return (
    <div className="w-full space-y-6 pb-8">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/users"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <nav className="flex items-center gap-1 text-xs text-slate-400 mb-0.5">
            <Link href="/dashboard" className="hover:text-slate-600">Dashboard</Link>
            <ChevronRight size={12} />
            <Link href="/dashboard/users" className="hover:text-slate-600">User Management</Link>
            <ChevronRight size={12} />
            <span className="text-slate-600 font-medium">New User</span>
          </nav>
          <h1 className="text-xl font-bold text-slate-900">Add New User</h1>
        </div>
      </div>

      <UserForm mode="create" />
    </div>
  );
}