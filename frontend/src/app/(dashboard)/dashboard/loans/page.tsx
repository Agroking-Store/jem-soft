"use client";

import { useState, useEffect, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import type { RootState, AppDispatch } from "@/store/store";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  AlertCircle,
  Landmark,
} from "lucide-react";
import { fetchLoans, deleteLoan } from "@/features/loans/loanSlice";
import toast from "react-hot-toast";

export default function LoansPage() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isClient, setIsClient] = useState(false);

  const canEdit = user?.role === "ADMIN" || user?.role === "ADVISOR";

  const { loans, isLoading } = useSelector((state: RootState) => state.loans);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    dispatch(fetchLoans());
  }, [dispatch]);

  const stats = useMemo(() => {
    return {
      total: loans.length,
      totalAmount: loans.reduce((sum, l) => sum + Number(l.loanAmount || 0), 0),
    };
  }, [loans]);

  const filteredLoans = loans.filter((loan) => {
    const customer = loan.policy?.CustomerMaster;
    return (
      loan.loanNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loan.policy?.policyNumber
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (customer &&
        `${customer.firstName} ${customer.lastName}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase()))
    );
  });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const result = await dispatch(deleteLoan(deleteTarget.id)).unwrap();
      toast.success(`Loan ${result.loanNumber} deleted successfully.`);
    } catch (err: any) {
      toast.error(err?.message || err || "Failed to delete loan.");
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
          <h1 className="text-2xl font-bold text-slate-900">Loans</h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage policy loans and their status
          </p>
        </div>
        {isClient && canEdit && (
          <button
            onClick={() => router.push("/dashboard/loans/new")}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-sm hover:shadow-md"
          >
            <Plus size={18} />
            New Loan
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 rounded-lg">
            <Landmark size={20} className="text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Total Loans</p>
            <p className="text-lg font-bold text-slate-900">{stats.total}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 rounded-lg">
            <Landmark size={20} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Total Loan Amount</p>
            <p className="text-lg font-bold text-slate-900">
              ₹ {stats.totalAmount.toLocaleString("en-IN")}
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by loan #, policy #, or customer..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Loan #
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Policy #
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Loan Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Interest Rate
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Loan Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                {isClient && canEdit && (
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredLoans.map((loan) => {
                const customer = loan.policy?.CustomerMaster;
                return (
                  <tr key={loan.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm font-medium text-slate-900">
                        {loan.loanNumber || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-600">
                        {loan.policy?.policyNumber || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-600">
                        {customer
                          ? `${customer.firstName} ${customer.lastName}`
                          : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-slate-900">
                        ₹ {Number(loan.loanAmount).toLocaleString("en-IN")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-600">
                        {loan.interestRate ? `${loan.interestRate}%` : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-600">
                        {loan.loanDate
                          ? new Date(loan.loanDate).toLocaleDateString("en-IN")
                          : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                        {loan.loanStatus?.statusName || "Unknown"}
                      </span>
                    </td>
                    {isClient && canEdit && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() =>
                              router.push(`/dashboard/loans/${loan.id}`)
                            }
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="View"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() =>
                              router.push(`/dashboard/loans/edit/${loan.id}`)
                            }
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(loan)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Empty / Loading */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-sm text-slate-500">Loading loans...</p>
        </div>
      ) : (
        filteredLoans.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200 mt-4">
            <Landmark size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              No Loans Found
            </h3>
            <p className="text-slate-500 text-sm">
              Try adjusting your search, or add a new loan.
            </p>
          </div>
        )
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-50 rounded-xl">
                <AlertCircle size={22} className="text-red-500" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Delete Loan
                </h3>
                <p className="text-xs text-slate-400">
                  This action cannot be undone
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              Are you sure you want to delete loan{" "}
              <strong>{deleteTarget.loanNumber || deleteTarget.id}</strong>?
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