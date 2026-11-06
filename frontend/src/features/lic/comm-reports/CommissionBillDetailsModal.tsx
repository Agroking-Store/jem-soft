"use client";

import { useState } from "react";
import {
  X,
  FileText,
  Calendar,
  Building2,
  ExternalLink,
  Coins,
  IndianRupee,
  ShieldCheck,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "@/store/store";
import { deleteCommissionBill, fetchCommissionBills } from "../commissionSlice";
import toast from "react-hot-toast";

interface CommissionBillDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: any | null;
}

export default function CommissionBillDetailsModal({
  isOpen,
  onClose,
  bill,
}: CommissionBillDetailsModalProps) {
  const dispatch = useDispatch<AppDispatch>();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  if (!isOpen || !bill) return null;

  const records: any[] = bill.records || [];

  const filteredRecords = records.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      (r.policyNumber || "").toLowerCase().includes(q) ||
      (r.policyHolderName || "").toLowerCase().includes(q) ||
      (r.customerName || "").toLowerCase().includes(q) ||
      (r.plan || "").toString().includes(q)
    );
  });

  const totalPages = Math.ceil(filteredRecords.length / pageSize) || 1;
  const paginatedRecords = filteredRecords.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete commission statement ${bill.billNumber}?`)) {
      try {
        await dispatch(deleteCommissionBill(bill.id)).unwrap();
        dispatch(fetchCommissionBills());
        toast.success(`Statement ${bill.billNumber} deleted successfully.`);
        onClose();
      } catch (err: any) {
        toast.error(err || "Failed to delete commission bill");
      }
    }
  };

  const formattedDate = bill.billDate
    ? new Date(bill.billDate).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "N/A";

  const totalPremium = Number(bill.totalPremium || 0);
  const grossCommission = Number(bill.grossCommission || 0);
  const taxDeduction = Number(bill.taxDeduction || grossCommission * 0.05);
  const netPayable = Number(bill.netPayable || grossCommission - taxDeduction);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-4xl rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#1877F2]">
              <FileText size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  {bill.billNumber}
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  <ShieldCheck size={11} />
                  Reconciled Statement
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Uploaded Till: <strong className="text-slate-700">{formattedDate}</strong>
                {bill.agencyName && ` • Agency: ${bill.agencyName}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {bill.fileUrl && (
              <a
                href={
                  bill.fileUrl.startsWith("http")
                    ? bill.fileUrl
                    : `http://localhost:5000${bill.fileUrl}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-[#1877F2] hover:bg-blue-100 font-semibold text-xs transition"
              >
                <ExternalLink size={13} />
                <span>Open Statement PDF</span>
              </a>
            )}
            <button
              onClick={handleDelete}
              title="Delete Statement Bill"
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
            >
              <Trash2 size={16} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Key Financial Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
              <span className="text-[11px] font-medium text-slate-500">Statement Period End</span>
              <div className="text-sm font-bold text-slate-900 mt-0.5 flex items-center gap-1.5">
                <Calendar size={14} className="text-[#1877F2]" />
                {formattedDate}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Uploaded till this date</div>
            </div>

            <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-3">
              <span className="text-[11px] font-semibold text-blue-700">Gross Commission</span>
              <div className="text-lg font-bold text-blue-900 mt-0.5">
                ₹{grossCommission.toLocaleString("en-IN")}
              </div>
              <div className="text-[10px] text-blue-600 mt-0.5">
                {records.length} policies recorded
              </div>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3">
              <span className="text-[11px] font-semibold text-emerald-700">Total Premium</span>
              <div className="text-lg font-bold text-emerald-900 mt-0.5">
                ₹{totalPremium.toLocaleString("en-IN")}
              </div>
              <div className="text-[10px] text-emerald-600 mt-0.5">Reconciled line items</div>
            </div>

            <div className="rounded-xl border border-purple-200 bg-purple-50/40 p-3">
              <span className="text-[11px] font-semibold text-purple-700">Net Commission</span>
              <div className="text-lg font-bold text-purple-900 mt-0.5">
                ₹{netPayable.toLocaleString("en-IN")}
              </div>
              <div className="text-[10px] text-purple-600 mt-0.5">
                After 5% TDS (₹{taxDeduction.toLocaleString("en-IN")})
              </div>
            </div>
          </div>

          {/* Records Search and Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                Line Items Reconciled ({records.length})
              </h3>
              <p className="text-xs text-slate-500">
                Policies matching this statement upload
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Search policy or customer..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-800 outline-none focus:border-[#1877F2]"
              />
            </div>
          </div>

          {/* Policy Records Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 max-h-[320px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold sticky top-0 z-10 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Customer / Policyholder</th>
                  <th className="py-2.5 px-3">Policy No.</th>
                  <th className="py-2.5 px-3">Due Date</th>
                  <th className="py-2.5 px-3 text-right">Premium (₹)</th>
                  <th className="py-2.5 px-3 text-right">Commission (₹)</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedRecords.map((r, idx) => (
                  <tr key={r.id || idx} className="hover:bg-slate-50/80 transition">
                    <td className="py-2 px-3 text-slate-400">
                      {(currentPage - 1) * pageSize + idx + 1}
                    </td>
                    <td className="py-2 px-3 font-semibold text-slate-900">
                      {r.policyHolderName || r.customerName || "N/A"}
                    </td>
                    <td className="py-2 px-3 font-mono font-bold text-slate-700">
                      {r.policyNumber}
                    </td>
                    <td className="py-2 px-3 text-slate-600">
                      {r.dueDate
                        ? new Date(r.dueDate).toLocaleDateString("en-GB")
                        : "N/A"}
                    </td>
                    <td className="py-2 px-3 text-right font-medium text-slate-900">
                      ₹{Number(r.premiumAmount || 0).toLocaleString("en-IN")}
                    </td>
                    <td className="py-2 px-3 text-right font-semibold text-emerald-700">
                      ₹{Number(r.commissionAmount || 0).toLocaleString("en-IN")}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Paid
                      </span>
                    </td>
                  </tr>
                ))}
                {paginatedRecords.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No policy line items found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
              <span>
                Showing {(currentPage - 1) * pageSize + 1} to{" "}
                {Math.min(currentPage * pageSize, filteredRecords.length)} of{" "}
                {filteredRecords.length}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition cursor-pointer"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="font-semibold text-slate-700">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition cursor-pointer"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
