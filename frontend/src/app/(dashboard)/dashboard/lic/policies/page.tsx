"use client";

import { useState, useEffect, useMemo, useRef } from "react";
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
  ChevronDown,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  IndianRupee,
  Calendar,
  Shield,
  Repeat,
  Users,
  ChevronRight,
} from "lucide-react";
import { fetchPolicies, deletePolicy } from "@/features/policy/policySlice";
import toast from "react-hot-toast";

const getStatusBadge = (status: string) => {
  const statusMap = {
    Active: { color: "bg-green-100 text-green-700", icon: CheckCircle },
    Pending: { color: "bg-yellow-100 text-yellow-700", icon: Clock },
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

function InfoPill({ icon, label, value }: { icon: React.ReactNode, label: string, value: string | React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 text-slate-500">{icon}</div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm font-semibold text-slate-800">{value || "—"}</p>
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
    console.log("Highlight ID:", highlightId);
    console.log("Policies:", policies);
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

  const stats = useMemo(() => {
    return {
      total: policies.length,
      active: policies.filter((p) => p.status?.statusName === "Active").length,
      pending: policies.filter((p) => p.status?.statusName === "Pending")
        .length,
      lapsed: policies.filter((p) => p.status?.statusName === "Lapsed").length,
    };
  }, [policies]);

  const filteredPolicies = policies.filter((policy) => {
    const lifeAssured = policy.CustomerMaster;
    const matchesSearch =
      policy.policyNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      policy.product?.productName
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (lifeAssured &&
        `${lifeAssured.firstName} ${lifeAssured.lastName}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase())) ||
      (policy.customer?.groupName &&
        policy.customer.groupName
          .toLowerCase()
          .includes(searchTerm.toLowerCase()));

    const matchesStatus =
      filterStatus === "All" || policy.status?.statusName === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const statusOptions = ["All", "Active", "Pending", "Lapsed", "Completed"];

  const handleDelete = async () => {
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
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">LIC Policies</h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage all LIC policies and their details
          </p>
        </div>
        {isClient && canEdit && (
          <button
            onClick={() => router.push("/dashboard/lic/policies/new")}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-sm hover:shadow-md"
          >
            <Plus size={18} />
            New Policy
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-xs text-slate-500 uppercase tracking-wider">
            Total Policies
          </p>
          <p className="text-2xl font-bold text-slate-900">
            {isLoading ? "..." : stats.total}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-xs text-slate-500 uppercase tracking-wider">
            Active
          </p>
          <p className="text-2xl font-bold text-green-600">
            {isLoading ? "..." : stats.active}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-xs text-slate-500 uppercase tracking-wider">
            Pending
          </p>
          <p className="text-2xl font-bold text-yellow-600">
            {isLoading ? "..." : stats.pending}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-xs text-slate-500 uppercase tracking-wider">
            Lapsed
          </p>
          <p className="text-2xl font-bold text-red-600">
            {isLoading ? "..." : stats.lapsed}
          </p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search by policy #, group name, or life assured..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 pr-8 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-sm appearance-none"
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={16}
              />
            </div>
            <button className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition text-sm flex items-center gap-2">
              <Filter size={16} />
              Filters
            </button>
          </div>
        </div>
      </div>

      {/* Card View */}
      <div className="space-y-4">
        {filteredPolicies.map((policy) => {
          const statusName = policy.status?.statusName || "Unknown";
          const statusBadge = getStatusBadge(statusName);
          const StatusIcon = statusBadge.icon;
          const lifeAssured = policy.CustomerMaster;
          const holderName = lifeAssured ? `${lifeAssured.firstName} ${lifeAssured.lastName}` : "";

          return (
            <div
              key={policy.id}
              ref={(el) => { rowRefs.current[policy.id] = el as HTMLTableRowElement | null; }}
              className={`group/item relative bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-lg hover:border-slate-300 transition-all duration-300
                ${activeHighlight === policy.id ? "ring-2 ring-offset-2 ring-yellow-400" : ""}`
              }
            >
              <div className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-base font-bold text-slate-900 bg-slate-100 px-3 py-1 rounded-lg">{policy.policyNumber}</span>
                      <h3 className="text-lg font-bold text-slate-800">{holderName}</h3>
                    </div>
                    <div className="flex items-center divide-x divide-slate-300 text-sm text-slate-500 mt-1">
                      {policy.provider?.name && <span className="pr-2">{policy.provider.name}</span>}
                      {policy.product?.productName && (
                        <span className="pl-2">{policy.product.productName}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadge.className}`}>
                      <StatusIcon size={13} />
                      {statusName}
                    </span>
                    {isClient && canEdit && (
                      <div className="flex items-center opacity-0 group-hover/item:opacity-100 transition-opacity duration-200">
                        <button onClick={() => router.push(`/dashboard/lic/policies/${policy.id}`)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition" title="View"><Eye size={16} /></button>
                        <button onClick={() => router.push(`/dashboard/lic/policies/edit/${policy.id}`)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition" title="Edit"><Edit size={16} /></button>
                        <button onClick={() => setDeleteTarget(policy)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition" title="Delete"><Trash2 size={16} /></button>
                      </div>
                    )}
                    <button onClick={() => router.push(`/dashboard/lic/policies/${policy.id}`)} className="p-2 text-slate-400 hover:text-slate-700 rounded-lg transition" title="View Details">
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-6 gap-y-5">
                  <InfoPill
                    icon={<IndianRupee size={16} />}
                    label="Sum Assured"
                    value={`₹ ${policy.premium?.sumAssured?.toLocaleString("en-IN") || 'N/A'}`}
                  />
                  <InfoPill
                    icon={<Shield size={16} />}
                    label="Premium"
                    value={`₹ ${policy.premium?.installmentPremium?.toLocaleString("en-IN") || 'N/A'}`}
                  />
                  <InfoPill
                    icon={<Repeat size={16} />}
                    label="Mode"
                    value={policy.premiumMode?.modeName}
                  />
                  <InfoPill
                    icon={<Calendar size={16} />}
                    label="Term / PPT"
                    value={`${policy.policyTerm || 'N/A'}Y / ${policy.premiumPayingTerm || 'N/A'}Y`}
                  />
                  <InfoPill
                    icon={<Calendar size={16} />}
                    label="FUP Date"
                    value={policy.nextPremiumDueDate ? new Date(policy.nextPremiumDueDate).toLocaleDateString("en-IN") : "N/A"}
                  />
                </div>
              </div>

              {/* Footer */}
              {policy.customer && (
                <div className="px-5 py-3 bg-slate-50/70 border-t border-slate-200 rounded-b-2xl">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Users size={14} />
                    {policy.customer.groupCode && (
                      <span className="font-mono bg-slate-200/70 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-bold">{policy.customer.groupCode}</span>
                    )}
                    <span className="font-medium">{policy.customer.groupName || 'N/A'}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-sm text-slate-500">Loading policies...</p>
        </div>
      ) : (
        filteredPolicies.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
            <FileText size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              No Policies Found
            </h3>
            <p className="text-slate-500 text-sm">
              Try adjusting your search or filter criteria
            </p>
          </div>
        )
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
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
              <strong>#{deleteTarget.policyNumber}</strong>? This will
              permanently remove all associated data.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                disabled={isDeleting}
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={isDeleting}
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold text-sm rounded-lg shadow-sm transition-colors flex items-center gap-2"
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
