"use client";

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  KeyRound,
  Shield,
  ShieldCheck,
  Eye,
  Users,
  UserCheck,
  ChevronRight,
} from "lucide-react";
import toast from "react-hot-toast";

import type { AppDispatch, RootState } from "@/store/store";
import { fetchAllUsers, deleteUser } from "@/features/user/userSlice";
import type { ManagedUser, UserRole } from "@/features/user/types";
import ResetPasswordModal from "@/features/user/components/ResetPasswordModal";

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  return fallback;
}

function Seal({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <div
      style={{ width: size, height: size, minWidth: size }}
      className="flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-[#1e3a8a] to-[#2563eb] font-bold text-white shadow-sm"
    >
      <span style={{ fontSize: size * 0.36, lineHeight: 1 }}>
        {getInitials(name)}
      </span>
    </div>
  );
}

const ROLE_CONFIG: Record<
  UserRole,
  { label: string; color: string; icon: React.ElementType }
> = {
  ADMIN: {
    label: "Admin",
    color: "bg-rose-50 text-rose-700 border-rose-200",
    icon: ShieldCheck,
  },
  ADVISOR: {
    label: "Advisor",
    color: "bg-blue-50 text-blue-700 border-blue-200",
    icon: Shield,
  },
  VIEWER: {
    label: "Viewer",
    color: "bg-slate-100 text-slate-600 border-slate-200",
    icon: Eye,
  },
};

function RoleBadge({ role }: { role: UserRole }) {
  const config = ROLE_CONFIG[role] ?? ROLE_CONFIG.VIEWER;
  const Icon = config.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${config.color}`}
    >
      <Icon size={11} />
      {config.label}
    </span>
  );
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
        isActive
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-slate-100 text-slate-500"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          isActive ? "bg-emerald-500" : "bg-slate-400"
        }`}
      />
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

function TableHeadCell({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "center" | "right";
}) {
  return (
    <th
      className={`sticky top-0 z-10 border-b border-slate-100 bg-slate-50/70 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400 ${
        align === "center"
          ? "text-center"
          : align === "right"
            ? "text-right"
            : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

type DeleteTarget = { id: string; name: string } | null;

export default function UserListPage() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();

  const { users, isLoading, error } = useSelector(
    (state: RootState) => state.userManagement,
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [resetTarget, setResetTarget] = useState<ManagedUser | null>(null);

  useEffect(() => {
    dispatch(fetchAllUsers());
  }, [dispatch]);

  const filtered = users.filter((u) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q);
    const matchesRole = roleFilter ? u.role === roleFilter : true;
    return matchesSearch && matchesRole;
  });

  const stats = {
    total: users.length,
    active: users.filter((u) => u.isActive).length,
    admins: users.filter((u) => u.role === "ADMIN").length,
    advisors: users.filter((u) => u.role === "ADVISOR").length,
    viewers: users.filter((u) => u.role === "VIEWER").length,
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await dispatch(deleteUser(deleteTarget.id)).unwrap();
      toast.success("User deleted successfully");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to delete user"));
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-slate-500">
        <Link
          href="/dashboard"
          className="hover:text-slate-700 transition-colors"
        >
          Dashboard
        </Link>
        <ChevronRight size={14} />
        <span className="font-medium text-slate-900">User Management</span>
      </nav>

      {/* Hero */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-blue-100 bg-[#f0f7ff] p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-[#1e3a8a] to-[#2563eb] text-white shadow-lg shadow-blue-200/50">
            <Users size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">
              User Management
            </h1>
            <p className="mt-0.5 text-sm font-medium text-slate-500">
              Manage system users, roles, and access permissions
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/users/new"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#5c67ff] to-[#3a47ff] px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-200 transition-all hover:brightness-110 active:scale-[0.98] self-start sm:self-auto"
        >
          <Plus size={16} />
          Add User
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          { label: "Total Users", value: stats.total, icon: Users },
          { label: "Active", value: stats.active, icon: UserCheck },
          { label: "Advisors", value: stats.advisors, icon: Shield },
          { label: "Viewers", value: stats.viewers, icon: Eye },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
            >
              <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#1877F2] via-[#1877F2]/40 to-transparent" />
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-slate-500">
                  {stat.label}
                </p>
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1877F2] flex items-center justify-center">
                  <Icon size={18} />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900">
                {isLoading ? (
                  <span className="inline-block h-8 w-12 animate-pulse rounded bg-slate-100" />
                ) : (
                  stat.value
                )}
              </p>
            </div>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={16}
          />
          <input
            type="text"
            placeholder="Search by name, email or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm focus:border-[#1877F2] focus:bg-white focus:ring-2 focus:ring-blue-500/15 outline-none transition-all"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm focus:border-[#1877F2] focus:bg-white focus:ring-2 focus:ring-blue-500/15 outline-none transition-all"
        >
          <option value="">All Roles</option>
          <option value="ADMIN">Admin</option>
          <option value="ADVISOR">Advisor</option>
          <option value="VIEWER">Viewer</option>
        </select>
      </div>

      {/* Table */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#1877F2] via-[#1877F2]/40 to-transparent" />
        
        {isLoading && users.length === 0 ? (
          <div className="flex min-h-[18rem] items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-[#1877F2]" />
          </div>
        ) : error && users.length === 0 ? (
          <div className="flex min-h-[18rem] flex-col items-center justify-center gap-3 text-center px-6">
            <p className="text-slate-500">{error}</p>
            <button
              onClick={() => dispatch(fetchAllUsers())}
              className="rounded-xl bg-[#0B1220] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#16294D]"
            >
              Try Again
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex min-h-[18rem] flex-col items-center justify-center gap-3 text-center px-6">
            <Users className="h-10 w-10 text-slate-300" />
            <p className="font-medium text-slate-700">No users found</p>
            <p className="text-sm text-slate-400">
              {searchTerm || roleFilter
                ? "Try adjusting your search or filter."
                : "Add the first user to get started."}
            </p>
            {!searchTerm && !roleFilter && (
              <Link
                href="/dashboard/users/new"
                className="inline-flex items-center gap-2 rounded-xl bg-[#0B1220] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#16294D]"
              >
                <Plus size={16} />
                Add First User
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto mt-2">
            <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
                <thead>
                  <tr>
                    <TableHeadCell>User</TableHeadCell>
                    <TableHeadCell>Email</TableHeadCell>
                    <TableHeadCell align="center">Role</TableHeadCell>
                    <TableHeadCell align="center">Status</TableHeadCell>
                    <TableHeadCell>Joined</TableHeadCell>
                    <TableHeadCell align="right">Actions</TableHeadCell>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((user, index) => (
                    <tr
                      key={user.id}
                      onDoubleClick={() =>
                        router.push(`/dashboard/users/${user.id}/edit`)
                      }
                      className={`group cursor-pointer border-b border-slate-100 transition-colors hover:bg-blue-50/40 ${
                        index % 2 === 0 ? "bg-white" : "bg-slate-50/30"
                      }`}
                    >
                      <td className="px-4 py-4 align-middle">
                        <div className="flex items-center gap-3">
                          <Seal name={user.name} size={36} />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-900 group-hover:text-[#1877F2] transition-colors">
                                {user.name}
                              </span>
                              <ChevronRight
                                size={13}
                                className="text-[#1877F2] opacity-0 transition-opacity group-hover:opacity-100"
                              />
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                              ID: {user.id.slice(0, 8)}...
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4 align-middle text-slate-600">
                        {user.email}
                      </td>

                      <td className="px-4 py-4 text-center align-middle">
                        <RoleBadge role={user.role as UserRole} />
                      </td>

                      <td className="px-4 py-4 text-center align-middle">
                        <StatusBadge isActive={user.isActive} />
                      </td>

                      <td className="px-4 py-4 align-middle text-sm text-slate-500">
                        {new Date(user.createdAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>

                      <td className="px-4 py-4 text-right align-middle">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setResetTarget(user)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-amber-50 hover:text-amber-600"
                            title="Reset Password"
                          >
                            <KeyRound size={14} />
                          </button>

                          <Link
                            href={`/dashboard/users/${user.id}/edit`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-[#0B1220]/5 hover:text-[#0B1220]"
                            title="Edit"
                          >
                            <Edit size={14} />
                          </Link>

                          <button
                            onClick={() =>
                              setDeleteTarget({ id: user.id, name: user.name })
                            }
                            className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t border-slate-100 px-4 py-3 mt-2">
              <p className="text-xs text-slate-500">
                Showing{" "}
                <strong className="text-slate-700">{filtered.length}</strong> of{" "}
                <strong className="text-slate-700">{users.length}</strong> users
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Reset Password Modal */}
      {resetTarget && (
        <ResetPasswordModal
          user={resetTarget}
          onClose={() => setResetTarget(null)}
        />
      )}

      {/* Delete Modal */}
      {deleteTarget && (
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
                  {deleteTarget.name}
                </p>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
