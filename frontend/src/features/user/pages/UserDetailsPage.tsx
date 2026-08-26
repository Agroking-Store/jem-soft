"use client";

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronRight,
  ArrowLeft,
  Edit,
  Trash2,
  KeyRound,
  Shield,
  ShieldCheck,
  Eye,
  Mail,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  UserCheck,
  Users,
  Lock,
} from "lucide-react";
import toast from "react-hot-toast";

import type { AppDispatch, RootState } from "@/store/store";
import {
  fetchUserById,
  deleteUser,
  clearCurrentUser,
} from "@/features/user/userSlice";
import type { ManagedUser, UserRole } from "@/features/user/types";
import ResetPasswordModal from "@/features/user/components/ResetPasswordModal";

interface Props {
  userId: string;
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return "-";
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "-";
  }
}

const ROLE_DETAILS: Record<
  UserRole,
  {
    label: string;
    description: string;
    color: string;
    icon: React.ElementType;
    permissions: { name: string; allowed: boolean }[];
  }
> = {
  ADMIN: {
    label: "Admin",
    description:
      "Complete administrative authority with full control over user management, master records, system configurations, policies, and claims.",
    color: "bg-rose-50 text-rose-700 border-rose-200",
    icon: ShieldCheck,
    permissions: [
      { name: "User Management (Create, Edit, Delete, Reset)", allowed: true },
      { name: "Customer & Group Management", allowed: true },
      { name: "Policy Creation & Modifications", allowed: true },
      { name: "Claims & Loans Processing", allowed: true },
      { name: "Financial & LIC Reports Generation", allowed: true },
      { name: "System Settings & Premium Rates", allowed: true },
    ],
  },
  ADVISOR: {
    label: "Advisor",
    description:
      "Operational access to create and manage customers, groups, policies, loans, and initiate claims without administrative configuration privileges.",
    color: "bg-blue-50 text-blue-700 border-blue-200",
    icon: Shield,
    permissions: [
      { name: "User Management", allowed: false },
      { name: "Customer & Group Management", allowed: true },
      { name: "Policy Creation & Modifications", allowed: true },
      { name: "Claims & Loans Processing", allowed: true },
      { name: "Financial & LIC Reports Generation", allowed: true },
      { name: "System Settings & Premium Rates", allowed: false },
    ],
  },
  VIEWER: {
    label: "Viewer",
    description:
      "Restricted read-only access to view customer portfolios, policy statuses, and generated reports without mutation capabilities.",
    color: "bg-slate-100 text-slate-600 border-slate-200",
    icon: Eye,
    permissions: [
      { name: "User Management", allowed: false },
      { name: "Customer & Group Records (Read-Only)", allowed: true },
      { name: "Policy Details (Read-Only)", allowed: true },
      { name: "Claims & Loans (Read-Only)", allowed: true },
      { name: "Reports View", allowed: true },
      { name: "Data Modification / Deletion", allowed: false },
    ],
  },
};

export default function UserDetailsPage({ userId }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();

  const { currentUser, isLoading, error } = useSelector(
    (state: RootState) => state.userManagement,
  );

  const [showResetModal, setShowResetModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    dispatch(fetchUserById(userId));
    return () => {
      dispatch(clearCurrentUser());
    };
  }, [dispatch, userId]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(true);
    toast.success("User ID copied to clipboard");
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleDelete = async () => {
    if (!currentUser) return;
    setIsDeleting(true);
    try {
      await dispatch(deleteUser(currentUser.id)).unwrap();
      toast.success("User deleted successfully");
      router.push("/dashboard/users");
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete user",
      );
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (isLoading && !currentUser) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-[#0B1220]" />
      </div>
    );
  }

  if (error || !currentUser) {
    return (
      <div className="mx-auto max-w-3xl py-16 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 mb-4">
          <XCircle size={32} />
        </div>
        <h3 className="text-xl font-bold text-slate-900">User Not Found</h3>
        <p className="mt-2 text-sm text-slate-500">
          {error ?? "The user information could not be retrieved."}
        </p>
        <div className="mt-6">
          <Link
            href="/dashboard/users"
            className="inline-flex items-center gap-2 rounded-xl bg-[#0B1220] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#16294D]"
          >
            <ArrowLeft size={16} />
            Back to Users
          </Link>
        </div>
      </div>
    );
  }

  const roleConfig =
    ROLE_DETAILS[currentUser.role as UserRole] ?? ROLE_DETAILS.VIEWER;
  const RoleIcon = roleConfig.icon;

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/users"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800 shadow-sm"
            title="Back to Users"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-0.5">
              <Link
                href="/dashboard"
                className="hover:text-slate-600 transition-colors"
              >
                Dashboard
              </Link>
              <ChevronRight size={12} />
              <Link
                href="/dashboard/users"
                className="hover:text-slate-600 transition-colors"
              >
                User Management
              </Link>
              <ChevronRight size={12} />
              <span className="font-medium text-slate-600">User Details</span>
            </nav>
            <h1 className="font-serif text-2xl font-bold text-[#0B1220]">
              User Details
            </h1>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setShowResetModal(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:text-amber-700"
          >
            <KeyRound size={14} className="text-amber-600" />
            Reset Password
          </button>

          <Link
            href={`/dashboard/users/${currentUser.id}/edit`}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:text-[#0B1220]"
          >
            <Edit size={14} />
            Edit User
          </Link>

          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-3.5 py-2 text-sm font-semibold text-rose-600 shadow-sm transition-colors hover:bg-rose-50 hover:text-rose-700"
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      </div>

      {/* Hero Banner Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0B1220] via-[#132342] to-[#16294D] p-6 shadow-sm sm:p-8">
        <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-5">
            {/* Avatar Seal */}
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-[#0B1220] font-serif text-2xl font-bold text-[#E8C77A] ring-2 ring-[#B8873A]/60 ring-offset-4 ring-offset-[#0B1220] shadow-md">
              {getInitials(currentUser.name)}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  {currentUser.name}
                </h2>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${roleConfig.color}`}
                >
                  <RoleIcon size={12} />
                  {roleConfig.label}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                    currentUser.isActive
                      ? "border-emerald-500/30 bg-emerald-500/20 text-emerald-300"
                      : "border-slate-400/30 bg-slate-500/20 text-slate-300"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      currentUser.isActive ? "bg-emerald-400" : "bg-slate-400"
                    }`}
                  />
                  {currentUser.isActive ? "Active Account" : "Inactive Account"}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-slate-300">
                <div className="flex items-center gap-1.5">
                  <Mail size={14} className="text-[#E8C77A]" />
                  <span>{currentUser.email}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-400">
                  <span>ID:</span>
                  <span className="font-mono text-xs text-slate-300">
                    {currentUser.id}
                  </span>
                  <button
                    onClick={() => copyToClipboard(currentUser.id)}
                    className="p-1 hover:text-white transition-colors"
                    title="Copy Full ID"
                  >
                    {copiedId ? (
                      <Check size={13} className="text-emerald-400" />
                    ) : (
                      <Copy size={13} />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative background blurs */}
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/[0.03]" />
        <div className="absolute -bottom-8 right-24 h-32 w-32 rounded-full bg-white/[0.03]" />
      </div>

      {/* Grid Layout for Detailed Information */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Account Details (2 cols) */}
        <div className="space-y-6 lg:col-span-2">
          {/* Basic Account Information */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#B8873A]/40 to-transparent" />
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/90 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#B8873A]/10 text-[#B8873A]">
                  <Users size={16} />
                </div>
                <h3 className="font-serif text-sm font-bold uppercase tracking-wider text-[#0B1220]">
                  User Profile Information
                </h3>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Full Name
                  </p>
                  <p className="text-base font-semibold text-slate-900">
                    {currentUser.name}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Email Address
                  </p>
                  <p className="text-base font-semibold text-slate-900">
                    {currentUser.email}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    System Role
                  </p>
                  <div className="mt-1">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${roleConfig.color}`}
                    >
                      <RoleIcon size={12} />
                      {roleConfig.label}
                    </span>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Status
                  </p>
                  <div className="mt-1">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
                        currentUser.isActive
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-slate-100 text-slate-500"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          currentUser.isActive
                            ? "bg-emerald-500"
                            : "bg-slate-400"
                        }`}
                      />
                      {currentUser.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>

                <div className="sm:col-span-2 pt-2 border-t border-slate-100">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    System User ID
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-xs text-slate-800">
                      {currentUser.id}
                    </code>
                    <button
                      onClick={() => copyToClipboard(currentUser.id)}
                      className="inline-flex items-center gap-1 text-xs text-[#B8873A] hover:underline font-medium"
                    >
                      {copiedId ? "Copied" : "Copy ID"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Role Capabilities & Permissions */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#B8873A]/40 to-transparent" />
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/90 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#B8873A]/10 text-[#B8873A]">
                  <Shield size={16} />
                </div>
                <h3 className="font-serif text-sm font-bold uppercase tracking-wider text-[#0B1220]">
                  Role & Permissions Matrix
                </h3>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                Level: {roleConfig.label}
              </span>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 rounded-xl p-4 border border-slate-100">
                {roleConfig.description}
              </p>

              <div className="mt-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                  Feature Access Capabilities
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {roleConfig.permissions.map((perm, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center gap-2.5 rounded-xl border p-3 text-xs font-medium transition-colors ${
                        perm.allowed
                          ? "border-emerald-100 bg-emerald-50/50 text-emerald-900"
                          : "border-slate-100 bg-slate-50/60 text-slate-400"
                      }`}
                    >
                      {perm.allowed ? (
                        <CheckCircle2
                          size={15}
                          className="shrink-0 text-emerald-600"
                        />
                      ) : (
                        <XCircle
                          size={15}
                          className="shrink-0 text-slate-400"
                        />
                      )}
                      <span>{perm.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Security, Audit & Quick Actions (1 col) */}
        <div className="space-y-6 lg:col-span-1">
          {/* Security & Authentication Card */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#B8873A]/40 to-transparent" />
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/90 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#B8873A]/10 text-[#B8873A]">
                  <Lock size={16} />
                </div>
                <h3 className="font-serif text-sm font-bold uppercase tracking-wider text-[#0B1220]">
                  Security
                </h3>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Password Status
                </p>
                <div className="flex items-center justify-between mt-1">
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700">
                    <CheckCircle2 size={15} className="text-emerald-500" />
                    Encrypted & Secured
                  </span>
                  <button
                    onClick={() => setShowResetModal(true)}
                    className="text-xs font-semibold text-[#B8873A] hover:underline"
                  >
                    Reset
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Login Access
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  {currentUser.isActive
                    ? "User can sign in with their registered email address."
                    : "User is deactivated and currently blocked from logging in."}
                </p>
              </div>
            </div>
          </div>

          {/* Audit & System Timestamps Card */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#B8873A]/40 to-transparent" />
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/90 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#B8873A]/10 text-[#B8873A]">
                  <Calendar size={16} />
                </div>
                <h3 className="font-serif text-sm font-bold uppercase tracking-wider text-[#0B1220]">
                  Audit Log
                </h3>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                  <Calendar size={15} />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Created At
                  </p>
                  <p className="text-sm font-medium text-slate-800 mt-0.5">
                    {formatDate(currentUser.createdAt)}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 pt-3 border-t border-slate-100">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                  <Clock size={15} />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Last Updated
                  </p>
                  <p className="text-sm font-medium text-slate-800 mt-0.5">
                    {formatDate(currentUser.updatedAt)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reset Password Modal */}
      {showResetModal && (
        <ResetPasswordModal
          user={currentUser}
          onClose={() => setShowResetModal(false)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.28)]">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                <Trash2 size={18} />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-slate-900">
                  Delete User
                </h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  This action cannot be undone. The user will lose all access to
                  the system.
                </p>
                <p className="mt-2 text-sm font-medium text-slate-700">
                  {currentUser.name} ({currentUser.email})
                </p>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeleting ? "Deleting..." : "Delete User"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
