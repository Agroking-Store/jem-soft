"use client";

import {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  ReactNode,
} from "react";
import { useSelector, useDispatch } from "react-redux";
import type { RootState, AppDispatch } from "@/store/store";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useNotificationStore } from "@/store/notificationStore";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  BarChart,
  FileText,
  ChevronRight,
} from "lucide-react";
import { fetchPolicies, deletePolicy } from "@/features/policy/policySlice";
import toast from "react-hot-toast";
import {
  CustomerEmptyState,
  CustomerToolbar,
  FilterSelect,
  CustomerTableFrame,
} from "@/features/customers/components/CustomerUi";

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Seal({ name, size = 36 }: { name: string; size?: number }) {
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

function Chip({
  dotColor,
  children,
}: {
  dotColor: string;
  children: ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
      <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
      {children}
    </span>
  );
}

function TableHeadCell({
  children,
  align = "left",
}: {
  children: ReactNode;
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

const getStatusBadge = (status: string) => {
  const statusMap = {
    Active: { color: "bg-green-100 text-green-700", icon: CheckCircle },
    Pending: { color: "bg-red-700 text-yellow-700", icon: Clock },
    Lapsed: { color: "bg-red-100 text-red-700", icon: XCircle },
    Completed: { color: "bg-blue-100 text-blue-700", icon: CheckCircle },
  };
  const StatusIcon =
    statusMap[status as keyof typeof statusMap]?.icon || AlertCircle;
  return {
    className:
      statusMap[status as keyof typeof statusMap]?.color ||
      "bg-gray-100 text-gray-700",
    icon: StatusIcon,
  };
};

function PolicyTypeModal({
  isOpen,
  onClose,
  onSelect,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (type: "LIC" | "OTHER") => void;
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Select Policy Type
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            Cancel
          </button>
        </div>
        <p className="text-sm text-slate-500 mb-6">
          Choose the policy category to continue with the right plan list.
        </p>
        <div className="grid gap-3">
          <button
            type="button"
            onClick={() => onSelect("LIC")}
            className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-left text-sm font-medium text-blue-700 transition hover:bg-blue-100"
          >
            LIC
          </button>
          <button
            type="button"
            onClick={() => onSelect("OTHER")}
            className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Other
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirmationModal({
  target,
  isDeleting,
  onCancel,
  onConfirm,
}: {
  target: any;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!target) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-50 rounded-xl">
            <AlertCircle size={22} className="text-red-500" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Delete Policy
            </h3>
            <p className="text-xs text-slate-400">
              This action cannot be undone
            </p>
          </div>
        </div>
        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
          Are you sure you want to delete policy{" "}
          <strong>#{target.policyNumber}</strong>? This will permanently remove
          all associated data.
        </p>
        <div className="flex items-center justify-end gap-3">
          <button
            disabled={isDeleting}
            onClick={onCancel}
            className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            disabled={isDeleting}
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold text-sm rounded-lg shadow-sm transition-colors flex items-center gap-2"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LICPoliciesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("highlight");

  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

  const [activeHighlight, setActiveHighlight] = useState<string | null>(null);

  const dispatch = useDispatch<AppDispatch>();
  const { fetchNotifications } = useNotificationStore();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPolicyTypeModalOpen, setIsPolicyTypeModalOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isClient, setIsClient] = useState(false);

  const canEdit = user?.role === "ADMIN" || user?.role === "ADVISOR";

  const { policies, isLoading } = useSelector(
    (state: RootState) => state.policies,
  );

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    dispatch(fetchPolicies());
  }, [dispatch]);

  useEffect(() => {
    if (!highlightId || policies.length === 0) return;

    setActiveHighlight(highlightId);

    setTimeout(() => {
      const row = rowRefs.current[highlightId];

      if (row) {
        row.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }, 300);

    const timer = setTimeout(() => {
      setActiveHighlight(null);
    }, 5000);

    return () => clearTimeout(timer);
  }, [highlightId, policies]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // If the user is typing in an input, textarea, or select, do nothing.
      const target = event.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) {
        return;
      }

      // If a character key is pressed, focus the search bar.
      if (
        event.key.length === 1 &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey
      ) {
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const { stats, filteredPolicies } = useMemo(() => {
    const lowerCaseSearchTerm = searchTerm.toLowerCase();

    const filtered = policies.filter((policy) => {
      const lifeAssured = policy.CustomerMaster;
      const matchesSearch =
        policy.policyNumber.toLowerCase().includes(lowerCaseSearchTerm) ||
        policy.product?.productName
          .toLowerCase()
          .includes(lowerCaseSearchTerm) ||
        (lifeAssured &&
          `${lifeAssured.firstName} ${lifeAssured.lastName}`
            .toLowerCase()
            .includes(lowerCaseSearchTerm)) ||
        (policy.customer?.groupName &&
          policy.customer.groupName
            .toLowerCase()
            .includes(lowerCaseSearchTerm));

      const matchesStatus =
        filterStatus === "All" || policy.status?.statusName === filterStatus;
      return matchesSearch && matchesStatus;
    });

    const calculatedStats = {
      total: policies.length,
      active: policies.filter((p) => p.status?.statusName === "Active").length,
      pending: policies.filter((p) => p.status?.statusName === "Pending")
        .length,
      lapsed: policies.filter((p) => p.status?.statusName === "Lapsed").length,
    };

    return { stats: calculatedStats, filteredPolicies: filtered };
  }, [policies, searchTerm, filterStatus]);

  const statusOptions = ["All", "Active", "Pending", "Lapsed", "Completed"];

  const filterStatusOptions = statusOptions.map((status) => ({
    value: status,
    label: status,
  }));

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const result = await dispatch(deletePolicy(deleteTarget.id)).unwrap();

      await fetchNotifications();

      toast.success(`Policy #${result.policyNumber} deleted successfully.`);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete policy.");
      console.error("Failed to delete policy:", err);
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  }, [deleteTarget, dispatch, fetchNotifications]);

  const handleCreatePolicySelection = useCallback(
    (type: "LIC" | "OTHER") => {
      setIsPolicyTypeModalOpen(false);
      router.push(
        `/dashboard/lic/policies/new?policyType=${type.toLowerCase()}`,
      );
    },
    [router],
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-8">
      {/* Top Banner Card */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-blue-100 bg-[#f0f7ff] p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-[#1e3a8a] to-[#2563eb] text-white shadow-lg shadow-blue-200/50">
            <FileText size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">
              Policies
            </h1>
            <p className="mt-0.5 text-sm font-medium text-slate-500">
              Manage all policies and their details
            </p>
          </div>
        </div>

        {isClient && canEdit && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPolicyTypeModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#5c67ff] to-[#3a47ff] px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-200 transition-all hover:brightness-110 active:scale-[0.98]"
            >
              <Plus size={16} />
              New Policy
            </button>
          </div>
        )}
      </div>

      <PolicyTypeModal
        isOpen={isPolicyTypeModalOpen}
        onClose={() => setIsPolicyTypeModalOpen(false)}
        onSelect={handleCreatePolicySelection}
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3 lg:flex-1 lg:min-w-0">
          <div className="relative min-w-0 flex-1 sm:max-w-md">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              size={16}
            />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search by policy #, group name, or life assured..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 transition-all focus:border-[#1877F2] focus:bg-white focus:ring-2 focus:ring-blue-500/15"
            />
          </div>
          <FilterSelect
            icon={Filter}
            placeholder="All Statuses"
            options={filterStatusOptions}
            value={filterStatus}
            onChange={setFilterStatus}
          />
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#1877F2] via-[#1877F2]/40 to-transparent" />

        {isLoading ? (
          <div className="flex min-h-[18rem] items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-[#1877F2]" />
          </div>
        ) : filteredPolicies.length === 0 ? (
          <CustomerEmptyState
            title={
              searchTerm || filterStatus !== "All"
                ? "No Policies Found"
                : "No policies have been added yet"
            }
            description={
              searchTerm || filterStatus !== "All"
                ? "Try adjusting your search or filter criteria to find what you're looking for."
                : "Get started by creating a new policy record."
            }
            action={
              isClient && canEdit && !searchTerm && filterStatus === "All" ? (
                <button
                  type="button"
                  onClick={() => setIsPolicyTypeModalOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#5c67ff] to-[#3a47ff] px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-200 transition-all hover:brightness-110"
                >
                  <Plus size={16} />
                  New Policy
                </button>
              ) : undefined
            }
          />
        ) : (
          <CustomerTableFrame
            footer={
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>
                  Showing{" "}
                  <strong className="text-slate-700">
                    {filteredPolicies.length}
                  </strong>{" "}
                  of <strong className="text-slate-700">{stats.total}</strong>{" "}
                  policies
                </span>
              </div>
            }
          >
            <table className="w-full min-w-[1200px] table-fixed border-separate border-spacing-0 text-left text-sm">
              <colgroup>
                <col className="w-[9%]" />
                <col className="w-[16%]" />
                <col className="w-[14%]" />
                <col className="w-[10%]" />
                <col className="w-[9%]" />
                <col className="w-[8%]" />
                <col className="w-[8%]" />
                <col className="w-[8%]" />
                <col className="w-[8%]" />
                <col className="w-[10%]" />
              </colgroup>
              <thead>
                <tr>
                  <TableHeadCell>Policy No.</TableHeadCell>
                  <TableHeadCell>Life Assured</TableHeadCell>
                  <TableHeadCell>Plan</TableHeadCell>
                  <TableHeadCell align="right">Sum Assured</TableHeadCell>
                  <TableHeadCell align="right">Premium</TableHeadCell>
                  <TableHeadCell>Mode</TableHeadCell>
                  <TableHeadCell>Term / PPT</TableHeadCell>
                  <TableHeadCell>FUP Date</TableHeadCell>
                  <TableHeadCell align="center">Status</TableHeadCell>
                  <TableHeadCell align="center">Actions</TableHeadCell>
                </tr>
              </thead>
              <tbody>
                {filteredPolicies.map((policy, index) => {
                  const statusName = policy.status?.statusName || "Unknown";
                  const statusBadge = getStatusBadge(statusName);
                  const StatusIcon = statusBadge.icon;
                  const lifeAssured = policy.CustomerMaster;
                  const holderName = lifeAssured
                    ? `${lifeAssured.firstName} ${lifeAssured.lastName}`
                    : "—";

                  let groupLabel = "—";
                  if (
                    policy.customer?.groupName &&
                    policy.customer?.groupCode
                  ) {
                    groupLabel = `${policy.customer.groupName} - ${policy.customer.groupCode}`;
                  } else if (policy.customer?.groupName) {
                    groupLabel = policy.customer.groupName;
                  } else if (policy.customer?.groupCode) {
                    groupLabel = policy.customer.groupCode;
                  }

                  let statusDot = "bg-slate-400";
                  if (statusName === "Active" || statusName === "Completed")
                    statusDot = "bg-emerald-500";
                  if (statusName === "Pending") statusDot = "bg-amber-500";
                  if (statusName === "Lapsed") statusDot = "bg-rose-500";

                  return (
                    <tr
                      key={policy.id}
                      ref={(el) => {
                        rowRefs.current[policy.id] =
                          el as HTMLTableRowElement | null;
                      }}
                      onClick={() =>
                        router.push(`/dashboard/lic/policies/${policy.id}`)
                      }
                      className={`group cursor-pointer border-b border-slate-100 transition-colors hover:bg-blue-50/40 ${
                        activeHighlight === policy.id
                          ? "bg-yellow-50/50"
                          : index % 2 === 0
                            ? "bg-white"
                            : "bg-slate-50/30"
                      }`}
                    >
                      <td className="h-[72px] px-3 py-3 align-middle">
                        <span className="inline-flex whitespace-nowrap rounded-lg bg-[#f1f5f9] px-3 py-1.5 font-mono text-xs font-semibold text-[#475569]">
                          {policy.policyNumber}
                        </span>
                      </td>
                      <td className="h-[72px] px-3 py-3 align-middle">
                        <div className="flex items-center gap-3 text-left">
                          <Seal name={holderName} size={36} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate font-semibold text-slate-900 transition-colors group-hover:text-[#1877F2]">
                                {holderName}
                              </span>
                              <ChevronRight
                                size={13}
                                className="text-[#1877F2] opacity-0 transition-opacity group-hover:opacity-100"
                              />
                            </div>
                            <div className="mt-0.5 truncate text-xs text-slate-400">
                              {groupLabel}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="h-[72px] px-3 py-3 align-middle">
                        <div className="line-clamp-2 font-semibold leading-5 text-slate-900">
                          {policy.product?.planNumber
                            ? `${policy.product.planNumber} - ${policy.product.productName || "—"}`
                            : policy.product?.productName || "—"}
                        </div>
                      </td>
                      <td className="h-[72px] whitespace-nowrap px-3 py-3 text-right align-middle font-semibold text-slate-900">
                        <span className="whitespace-nowrap">
                          {policy.premium?.sumAssured
                            ? `₹ ${policy.premium.sumAssured.toLocaleString("en-IN")}`
                            : "N/A"}
                        </span>
                      </td>
                      <td className="h-[72px] whitespace-nowrap px-3 py-3 text-right align-middle text-slate-800">
                        {policy.premium?.installmentPremium
                          ? `₹ ${policy.premium.installmentPremium.toLocaleString("en-IN")}`
                          : "N/A"}
                      </td>
                      <td className="h-[72px] px-3 py-3 align-middle text-slate-800">
                        {policy.premiumMode?.modeName || "N/A"}
                      </td>
                      <td className="h-[72px] px-3 py-3 align-middle text-slate-800">
                        <div className="flex flex-col text-xs">
                          <span>
                            T:{" "}
                            {policy.policyTerm
                              ? `${policy.policyTerm}Y`
                              : "N/A"}
                          </span>
                          <span className="text-slate-400">
                            P:{" "}
                            {policy.premiumPayingTerm
                              ? `${policy.premiumPayingTerm}Y`
                              : "N/A"}
                          </span>
                        </div>
                      </td>
                      <td className="h-[72px] whitespace-nowrap px-3 py-3 align-middle text-slate-800">
                        {policy.nextPremiumDueDate
                          ? new Date(
                              policy.nextPremiumDueDate,
                            ).toLocaleDateString("en-IN")
                          : "N/A"}
                      </td>
                      <td className="h-[72px] px-3 py-3 text-center align-middle">
                        <Chip dotColor={statusDot}>{statusName}</Chip>
                      </td>
                      <td className="h-[72px] px-3 py-3 text-center align-middle">
                        <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(
                                `/dashboard/lic/policies/${policy.id}`,
                              );
                            }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-[#1877F2] hover:scale-105"
                            title="View"
                          >
                            <Eye size={14} />
                          </button>
                          {isClient && canEdit && (
                            <>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(
                                    `/dashboard/lic/policies/edit/${policy.id}`,
                                  );
                                }}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-blue-100 bg-white text-[#1877F2] transition-all hover:border-blue-300 hover:bg-blue-50 hover:scale-105"
                                title="Edit"
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteTarget(policy);
                                }}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-rose-100 bg-white text-rose-600 transition-all hover:border-rose-300 hover:bg-rose-50 hover:scale-105"
                                title="Delete"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CustomerTableFrame>
        )}
      </div>

      <DeleteConfirmationModal
        target={deleteTarget}
        isDeleting={isDeleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
