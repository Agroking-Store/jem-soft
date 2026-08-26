"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
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
} from "lucide-react";
import { fetchPolicies, deletePolicy } from "@/features/policy/policySlice";
import toast from "react-hot-toast";
import {
  CustomerEmptyState,
  CustomerPageHero,
  CustomerStatCard,
  CustomerToolbar,
  FilterSelect,
} from "@/features/customers/components/CustomerUi";

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
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <CustomerPageHero
        title="Policies"
        subtitle="Manage all policies and their details"
        actions={
          isClient &&
          canEdit && (
            <button
              onClick={() => setIsPolicyTypeModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-linear-to-r from-[#B8873A] to-[#E8C77A] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_6px_16px_rgba(184,135,58,0.2)] transition-all duration-200 hover:shadow-[0_8px_20px_rgba(184,135,58,0.25)]"
            >
              <Plus size={16} />
              <span>New Policy</span>
            </button>
          )
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <CustomerStatCard
          label="Total Policies"
          value={isLoading ? "..." : stats.total}
          icon={BarChart}
          tone="accent"
        />
        <CustomerStatCard
          label="Active"
          value={isLoading ? "..." : stats.active}
          icon={CheckCircle}
          tone="success"
        />
        <CustomerStatCard
          label="Pending"
          value={isLoading ? "..." : stats.pending}
          icon={Clock}
          tone="warning"
        />
        <CustomerStatCard
          label="Lapsed"
          value={isLoading ? "..." : stats.lapsed}
          icon={XCircle}
          tone="warning"
        />
      </div>

      <PolicyTypeModal
        isOpen={isPolicyTypeModalOpen}
        onClose={() => setIsPolicyTypeModalOpen(false)}
        onSelect={handleCreatePolicySelection}
      />

      {/* Search and Filter */}
      <CustomerToolbar>
        <div className="flex-1 relative">
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
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/20"
          />
        </div>
        <div className="flex items-center gap-2">
          <FilterSelect
            icon={Filter}
            placeholder="All Statuses"
            options={filterStatusOptions}
            value={filterStatus}
            onChange={setFilterStatus}
          />
        </div>
      </CustomerToolbar>

      {/* Policies Table */}
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full table-fixed divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th
                  scope="col"
                  className="sticky top-0 z-10 w-[110px] px-3 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500"
                >
                  Policy No.
                </th>
                <th
                  scope="col"
                  className="sticky top-0 z-10 w-[150px] px-3 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500"
                >
                  Life Assured
                </th>
                <th
                  scope="col"
                  className="sticky top-0 z-10 w-[240px] px-3 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500"
                >
                  Plan
                </th>
                <th
                  scope="col"
                  className="sticky top-0 z-10 w-[110px] whitespace-nowrap px-3 py-4 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-500"
                >
                  Sum Assured
                </th>
                <th
                  scope="col"
                  className="sticky top-0 z-10 w-[100px] px-3 py-4 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-500"
                >
                  Premium
                </th>
                <th
                  scope="col"
                  className="sticky top-0 z-10 w-[80px] px-3 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500"
                >
                  Mode
                </th>
                <th
                  scope="col"
                  className="w-[60px] px-3 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500"
                >
                  Term
                </th>
                <th
                  scope="col"
                  className="w-[60px] px-3 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500"
                >
                  PPT
                </th>
                <th
                  scope="col"
                  className="w-[90px] px-3 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500"
                >
                  FUP Date
                </th>
                <th
                  scope="col"
                  className="w-[90px] px-3 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500"
                >
                  Status
                </th>
                <th
                  scope="col"
                  className="sticky top-0 z-10 w-[110px] px-3 py-4 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-500"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {filteredPolicies.map((policy) => {
                const statusName = policy.status?.statusName || "Unknown";
                const statusBadge = getStatusBadge(statusName);
                const StatusIcon = statusBadge.icon;
                const lifeAssured = policy.CustomerMaster;
                const holderName = lifeAssured
                  ? `${lifeAssured.firstName} ${lifeAssured.lastName}`
                  : "";

                return (
                  <tr
                    key={policy.id}
                    ref={(el) => {
                      rowRefs.current[policy.id] =
                        el as HTMLTableRowElement | null;
                    }}
                    className={`group/item transition-colors duration-200 ${activeHighlight === policy.id ? "bg-yellow-50 ring-2 ring-offset-2 ring-yellow-400" : "hover:bg-slate-50"}`}
                  >
                    <td className="whitespace-nowrap px-4 py-4 align-top text-sm font-semibold text-slate-900">
                      {policy.policyNumber}
                    </td>
                    <td className="min-w-[180px] px-4 py-4 align-top text-sm text-slate-800">
                      <div className="font-semibold text-slate-900">
                        {holderName || "—"}
                      </div>
                      {(policy.customer?.groupName ||
                        policy.customer?.groupCode) && (
                        <div className="mt-1 text-xs text-slate-500">
                          {(() => {
                            const groupName = policy.customer?.groupName;
                            const groupCode = policy.customer?.groupCode;

                            if (groupName && groupCode) {
                              return `${groupName} - ${groupCode}`;
                            } else if (groupName) {
                              return groupName;
                            } else {
                              return groupCode;
                            }
                          })()}
                        </div>
                      )}
                    </td>
                    <td className="min-w-[380px] whitespace-normal break-words px-4 py-4 align-top text-sm text-slate-800">
                      <div className="font-semibold text-slate-900 break-words">
                        {policy.product?.planNumber
                          ? `${policy.product.planNumber} - ${policy.product.productName || "—"}`
                          : policy.product?.productName || "—"}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 align-top text-right text-sm font-semibold text-slate-900">
                      {policy.premium?.sumAssured
                        ? `₹ ${policy.premium.sumAssured.toLocaleString("en-IN")}`
                        : "N/A"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 align-top text-right text-sm text-slate-800">
                      {policy.premium?.installmentPremium
                        ? `₹ ${policy.premium.installmentPremium.toLocaleString("en-IN")}`
                        : "N/A"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 align-top text-sm text-slate-800">
                      {policy.premiumMode?.modeName || "N/A"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 align-top text-sm text-slate-800">
                      {policy.policyTerm ? `${policy.policyTerm}Y` : "N/A"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 align-top text-sm text-slate-800">
                      {policy.premiumPayingTerm
                        ? `${policy.premiumPayingTerm}Y`
                        : "N/A"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 align-top text-sm text-slate-800">
                      {policy.nextPremiumDueDate
                        ? new Date(
                            policy.nextPremiumDueDate,
                          ).toLocaleDateString("en-IN")
                        : "N/A"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 align-top text-sm text-slate-800">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadge.className}`}
                      >
                        <StatusIcon size={14} />
                        {statusName}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 align-top text-right text-sm text-slate-800">
                      <div className="inline-flex items-center justify-end gap-2">
                        <button
                          onClick={() =>
                            router.push(`/dashboard/lic/policies/${policy.id}`)
                          }
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition opacity-0 group-hover/item:opacity-100"
                          title="View"
                        >
                          <Eye size={16} />
                        </button>
                        {isClient && canEdit && (
                          <>
                            <button
                              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition opacity-0 group-hover/item:opacity-100"
                              onClick={() =>
                                router.push(
                                  `/dashboard/lic/policies/edit/${policy.id}`,
                                )
                              }
                              title="Edit"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition opacity-0 group-hover/item:opacity-100"
                              onClick={() => setDeleteTarget(policy)}
                              title="Delete"
                            >
                              <Trash2 size={16} />
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
        </div>
      </div>

      {/* Empty State */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-sm text-slate-500">Loading policies...</p>
        </div>
      ) : (
        filteredPolicies.length === 0 &&
        (searchTerm || filterStatus !== "All" ? (
          <CustomerEmptyState
            title="No Policies Found"
            description="Try adjusting your search or filter criteria to find what you're looking for."
          />
        ) : (
          <CustomerEmptyState
            title="No policies have been added yet"
            description="Get started by creating a new policy record."
            action={
              isClient &&
              canEdit && (
                <button
                  onClick={() => setIsPolicyTypeModalOpen(true)}
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-gradient-to-r from-[#B8873A] to-[#E8C77A] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_6px_16px_rgba(184,135,58,0.2)] transition-all duration-200 hover:shadow-[0_8px_20px_rgba(184,135,58,0.25)]"
                >
                  <Plus size={16} />
                  <span>New Policy</span>
                </button>
              )
            }
          />
        ))
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        target={deleteTarget}
        isDeleting={isDeleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
