"use client";

import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import Link from "next/link";
import { ChevronRight, ArrowLeft } from "lucide-react";

import type { AppDispatch, RootState } from "@/store/store";
import { fetchUserById, clearCurrentUser } from "@/features/user/userSlice";
import UserForm from "@/features/user/components/UserForm";

interface Props {
  userId: string;
}

export default function UserEditPage({ userId }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const { currentUser, isLoading, error } = useSelector(
    (state: RootState) => state.userManagement,
  );

  useEffect(() => {
    dispatch(fetchUserById(userId));
    return () => {
      dispatch(clearCurrentUser());
    };
  }, [dispatch, userId]);

  if (isLoading && !currentUser) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-[#1877F2]" />
      </div>
    );
  }

  if (error || !currentUser) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <p className="text-slate-500">{error ?? "User not found"}</p>
        <Link
          href="/dashboard/users"
          className="rounded-xl bg-gradient-to-r from-[#5c67ff] to-[#3a47ff] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-200 transition-all hover:brightness-110"
        >
          Back to Users
        </Link>
      </div>
    );
  }

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
            <span className="text-slate-600 font-medium">
              {currentUser.name || currentUser.email || "Edit"}
            </span>
          </nav>
          <h1 className="text-xl font-bold text-slate-900">Edit User</h1>
        </div>
      </div>

      <UserForm mode="edit" initialData={currentUser} />
    </div>
  );
}