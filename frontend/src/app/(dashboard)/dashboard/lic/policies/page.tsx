"use client";

import { useState, useEffect, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import type { RootState, AppDispatch } from "@/store/store";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  ChevronDown,
  FileText,
  User,
  Calendar,
  DollarSign,
  Building2,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Grid3x3,
  List,
} from "lucide-react";
import { fetchPolicies } from "@/features/policy/policySlice";

const getStatusBadge = (status: string) => {
  const statusMap = {
    Active: { color: "bg-green-100 text-green-700", icon: CheckCircle },
    Pending: { color: "bg-yellow-100 text-yellow-700", icon: Clock },
    Lapsed: { color: "bg-red-100 text-red-700", icon: XCircle },
    Completed: { color: "bg-blue-100 text-blue-700", icon: CheckCircle },
  };
  const StatusIcon = statusMap[status as keyof typeof statusMap]?.icon || AlertCircle;
  return {
    className: statusMap[status as keyof typeof statusMap]?.color || "bg-gray-100 text-gray-700",
    icon: StatusIcon,
  };
};

export default function LICPoliciesPage() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const [selectedPolicy, setSelectedPolicy] = useState<number | null>(null);

  const { policies, isLoading } = useSelector((state: RootState) => state.policies);

  useEffect(() => {
    dispatch(fetchPolicies());
  }, [dispatch]);

  const stats = useMemo(() => {
    return {
      total: policies.length,
      active: policies.filter(p => p.status?.statusName === 'Active').length,
      pending: policies.filter(p => p.status?.statusName === 'Pending').length,
      lapsed: policies.filter(p => p.status?.statusName === 'Lapsed').length,
    };
  }, [policies]);

  const filteredPolicies = policies.filter((policy) => {
    const lifeAssured = policy.CustomerMaster;
    const matchesSearch = 
      policy.policyNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      policy.product?.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lifeAssured && `${lifeAssured.firstName} ${lifeAssured.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (policy.client?.groupName && policy.client.groupName.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = filterStatus === "All" || policy.status?.statusName === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const statusOptions = ["All", "Active", "Pending", "Lapsed", "Completed"];

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
        <button
          onClick={() => router.push("/dashboard/lic/policies/new")}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-sm hover:shadow-md"
        >
          <Plus size={18} />
          New Policy
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Total Policies</p>
          <p className="text-2xl font-bold text-slate-900">{isLoading ? '...' : stats.total}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Active</p>
          <p className="text-2xl font-bold text-green-600">{isLoading ? '...' : stats.active}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Pending</p>
          <p className="text-2xl font-bold text-yellow-600">{isLoading ? '...' : stats.pending}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Lapsed</p>
          <p className="text-2xl font-bold text-red-600">{isLoading ? '...' : stats.lapsed}</p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
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
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            </div>
            <button className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition text-sm flex items-center gap-2">
              <Filter size={16} />
              Filters
            </button>
            {/* View Toggle */}
            <div className="flex border border-slate-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode("card")}
                className={`px-3 py-2 transition ${
                  viewMode === "card"
                    ? "bg-blue-50 text-blue-600"
                    : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                <Grid3x3 size={18} />
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`px-3 py-2 border-l border-slate-200 transition ${
                  viewMode === "table"
                    ? "bg-blue-50 text-blue-600"
                    : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                <List size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Card View */}
      {viewMode === "card" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredPolicies.map((p) => {
            const policy = { ...p, status: p.status?.statusName ?? 'Unknown' }; // Use local var for status
            const lifeAssured = policy.CustomerMaster;
            const holderName = lifeAssured ? `${lifeAssured.firstName} ${lifeAssured.lastName}` : '';
            const statusBadge = getStatusBadge(policy.status);
            const StatusIcon = statusBadge.icon;
            return (
              <div
                key={policy.id}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow duration-300 group"
              >
                {/* Policy Header */}
                <div className="p-4 border-b border-slate-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        {policy.policyNumber} <span className="font-medium text-slate-600">{holderName}</span>
                      </h3>
                    </div>
                    <p className="text-sm font-medium text-slate-600">{policy.provider?.name}</p>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-sm text-slate-500">{policy.product?.planNumber ? `[${policy.product.planNumber}] ` : ''}{policy.product?.productName}</p>
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge.className}`}>
                      <StatusIcon size={13} />
                      <span>{policy.status}</span>
                    </span>                  
                  </div>
                </div>

                {/* Policy Details Grid */}
                <div className="p-4">
                  <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                    {/* Left Column */}
                    <div className="space-y-3">
                      <div><p className="text-xs text-slate-400 uppercase tracking-wider">Mode</p><p className="text-sm font-medium text-slate-900">{policy.premiumMode?.modeName || 'N/A'}</p></div>
                      <div><p className="text-xs text-slate-400 uppercase tracking-wider">Term</p><p className="text-sm font-medium text-slate-900">{policy.policyTerm || 'N/A'}</p></div>
                      <div><p className="text-xs text-slate-400 uppercase tracking-wider">Sum Assured</p><p className="text-sm font-medium text-blue-600">₹ {policy.premium?.sumAssured?.toLocaleString('en-IN') || 'N/A'}</p></div>
                      <div><p className="text-xs text-slate-400 uppercase tracking-wider">Gr.code</p><p className="text-sm font-medium text-slate-900">{policy.client?.groupCode || 'N/A'}</p></div>
                      <div><p className="text-xs text-slate-400 uppercase tracking-wider">GST</p><p className="text-sm font-medium text-slate-900">₹ {policy.premium?.gst?.toLocaleString('en-IN') || '0'}</p></div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-3">
                      <div><p className="text-xs text-slate-400 uppercase tracking-wider">FUP Date</p><p className="text-sm font-medium text-slate-900">{policy.nextPremiumDueDate ? new Date(policy.nextPremiumDueDate).toLocaleDateString() : 'N/A'}</p></div>
                      <div><p className="text-xs text-slate-400 uppercase tracking-wider">PPT</p><p className="text-sm font-medium text-slate-900">{policy.premiumPayingTerm || 'N/A'}</p></div>
                      <div><p className="text-xs text-slate-400 uppercase tracking-wider">Provider</p><p className="text-sm font-medium text-slate-900">{policy.provider?.name || 'N/A'}</p></div>
                      <div><p className="text-xs text-slate-400 uppercase tracking-wider">Comm. Date</p><p className="text-sm font-medium text-slate-900">{new Date(policy.commencementDate).toLocaleDateString()}</p></div>
                      <div><p className="text-xs text-slate-400 uppercase tracking-wider">Premium Amount</p><p className="text-sm font-bold text-green-600">₹ {policy.premium?.installmentPremium?.toLocaleString('en-IN') || 'N/A'}</p></div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                    <button
                      onClick={() => router.push(`/dashboard/lic/policies/${policy.id}`)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      title="View"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => router.push(`/dashboard/lic/policies/edit/${policy.id}`)}
                      className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                      title="Edit"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Table View */}
      {viewMode === "table" && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Policy #</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Plan</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Sum Assured</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Premium</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Fup Date</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredPolicies.map((policy) => {
                  const statusName = policy.status?.statusName || 'Unknown';
                  const statusBadge = getStatusBadge(statusName);
                  const StatusIcon = statusBadge.icon;
                  return (
                    <tr key={policy.id} className="hover:bg-slate-50 transition group">
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-mono text-sm font-medium text-slate-900">
                            {policy.policyNumber}
                          </span>
                          <span className="text-xs text-slate-400">{policy.client?.groupName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-600">{policy.product?.productName}</span>
                        <div className="text-xs text-slate-400">
                          {policy.policyTerm}Y / {policy.premiumPayingTerm}Y PPT
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-slate-900">₹ {policy.premium?.sumAssured?.toLocaleString('en-IN')}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-600">₹ {policy.premium?.installmentPremium?.toLocaleString('en-IN')}</span>
                        <div className="text-xs text-slate-400">{policy.premiumMode?.modeName}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusBadge.className}`}>
                          <StatusIcon size={12} />
                          {statusName}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-600">{policy.nextPremiumDueDate ? new Date(policy.nextPremiumDueDate).toLocaleDateString() : 'N/A'}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition">
                          <button
                            onClick={() => router.push(`/dashboard/lic/policies/${policy.id}`)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="View"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => router.push(`/dashboard/lic/policies/${policy.id}/edit`)}
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-sm text-slate-500">Loading policies...</p>
        </div>
      ) : filteredPolicies.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <FileText size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No Policies Found</h3>
          <p className="text-slate-500 text-sm">Try adjusting your search or filter criteria</p>
        </div>
      )}
    </div>
  );
}