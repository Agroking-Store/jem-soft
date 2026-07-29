"use client";

import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import Link from "next/link";
import { ChevronRight, UserCog } from "lucide-react";

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
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-[#0B1220]" />
      </div>
    );
  }

  if (error || !currentUser) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <p className="text-slate-500">{error ?? "User not found"}</p>
        <Link
          href="/dashboard/users"
          className="rounded-xl bg-[#0B1220] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#16294D]"
        >
          Back to Users
        </Link>
      </div>
    );
  }

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
        <span className="font-medium text-slate-900">Edit User</span>
      </nav>

      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0B1220] via-[#132342] to-[#16294D] px-8 py-8">
        <div className="relative z-10 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#E8C77A]/10 ring-1 ring-[#E8C77A]/20">
            <UserCog className="h-6 w-6 text-[#E8C77A]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Edit User</h1>
            <p className="mt-0.5 text-sm text-slate-400">
              {currentUser.name} &nbsp;·&nbsp; {currentUser.email}
            </p>
          </div>
        </div>
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/[0.03]" />
        <div className="absolute -bottom-6 right-20 h-24 w-24 rounded-full bg-white/[0.03]" />
      </div>

      <UserForm mode="edit" initialData={currentUser} />
    </div>
  );
}
