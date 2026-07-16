"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import type { RootState, AppDispatch } from "@/store/store";
import { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { fetchClaims } from "@/features/claim/claimSlice";
import { fetchPolicies } from "@/features/policy/policySlice";
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
  List,
  Grid3x3,
} from "lucide-react";

export default function Page() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useAuth();

  const { policies } = useSelector((state: RootState) => state.policies);

  const { claims, isLoading, error } = useSelector(
    (state: RootState) => state.claims,
  );

  const canEdit = user?.role === "ADMIN" || user?.role === "ADVISOR";

  useEffect(() => {
    dispatch(fetchClaims());
    dispatch(fetchPolicies());
  }, [dispatch]);

  const stats = useMemo(() => {
    return {
      total: policies.length,
      active: policies.filter((p) => p.status?.statusName === "Active").length,
      pending: policies.filter((p) => p.status?.statusName === "Pending")
        .length,
      lapsed: policies.filter((p) => p.status?.statusName === "Lapsed").length,
    };
  }, [policies]);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Claims</h1>
          <p className="text-slate-500 text-sm mt-1">Manage all your claims</p>
        </div>
        <div>
          <button
            onClick={() => router.push("/dashboard/claims/new")}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-sm hover:shadow-md"
          >
            <Plus size={18} />
            New Claim
          </button>
        </div>
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
        {/* <div className="bg-white p-4 rounded-xl border border-slate-200">
                <p className="text-xs text-slate-500 uppercase tracking-wider">
                    Active
                </p>
                <p className="text-2xl font-bold text-green-600">
                    {isLoading ? "..." : stats.active}
                </p>
                </div> */}
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-xs text-slate-500 uppercase tracking-wider">
            Total claims
          </p>
          <p className="text-2xl font-bold text-yellow-600">
            {isLoading ? "..." : claims.length}
          </p>
        </div>
        {/* <div className="bg-white p-4 rounded-xl border border-slate-200">
                <p className="text-xs text-slate-500 uppercase tracking-wider">
                    Lapsed
                </p>
                <p className="text-2xl font-bold text-red-600">
                    {isLoading ? "..." : stats.lapsed}
                </p>
                </div> */}
      </div>
      {/* Table View */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Claim #
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Policy #
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Claimant Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {claims.map((claim) => (
                <tr key={claim.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3">{claim.id}</td>

                  <td className="px-4 py-3">{claim.policy?.policyNumber}</td>

                  <td className="px-4 py-3">{claim.claimantName}</td>

                  <td className="px-4 py-3">{claim.claimType}</td>

                  <td className="px-4 py-3">
                    ₹{claim.claimAmount.toLocaleString("en-IN")}
                  </td>

                  {/* <td className="px-4 py-3">
                {new Date(claim.claimDate).toLocaleDateString()}
              </td> */}

                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium
                    ${
                      claim.status === "Approved"
                        ? "bg-green-100 text-green-700"
                        : claim.status === "Rejected"
                          ? "bg-red-100 text-red-700"
                          : claim.status === "In Progress"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-yellow-100 text-yellow-700"
                    }`}
                    >
                      {claim.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {canEdit && (
                      <div className="flex items-center justify-end gap-1 ">
                        <button
                          onClick={() =>
                            router.push(`/dashboard/claims/${claim.id}`)
                          }
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="View"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() =>
                            router.push(`/dashboard/claims/edit/${claim.id}`)
                          }
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
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
