"use client";

import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Eye,
  FileText,
  Plus,
  Search,
  Trash2,
  SquarePen,
  ChevronRight,
} from "lucide-react";
import toast from "react-hot-toast";
import { AppDispatch, RootState } from "@/store/store";
import {
  fetchQuotations,
  deleteQuotation,
} from "@/features/quotations/quotationSlice";
import type { Quotation, QuotationProductType } from "@/features/quotations/types";
import {
  QuotationEmptyState,
  QuotationTableFrame,
  QuotationTableHeadCell,
} from "@/features/quotations/components/QuotationUi";
import type { QuotationModalEntry } from "@/features/quotations/components/QuotationModalStack";

const PRODUCT_LABELS: Record<QuotationProductType, string> = {
  LIFE_GUARD: "Life Guard",
  PROTECT_AND_EARN: "Protect & Earn",
  RETIRE_ENJOY_I: "Retire Enjoy I",
};

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function Seal({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <div
      style={{ width: size, height: size, minWidth: size }}
      className="flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-[#1e3a8a] to-[#2563eb] font-bold text-white shadow-sm"
    >
      <span style={{ fontSize: size * 0.36, lineHeight: 1 }}>{getInitials(name)}</span>
    </div>
  );
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  const day = String(date.getDate()).padStart(2, "0");
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${day}/${months[date.getMonth()]}/${date.getFullYear()}`;
}

function formatCurrency(val?: number | null) {
  if (val === undefined || val === null) return "₹ 0";
  return `₹ ${Number(val).toLocaleString("en-IN")}`;
}

interface QuotationListPageProps {
  productType: QuotationProductType;
  onOpenModal: (type: QuotationModalEntry["type"], id?: string, productType?: QuotationProductType) => void;
  onViewReport: (id: string) => void;
}

export default function QuotationListPage({ productType, onOpenModal, onViewReport }: QuotationListPageProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { quotations, total, page, limit, totalPages, isLoading, error } = useSelector(
    (state: RootState) => state.quotations
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [searchField, setSearchField] = useState("quotationRefNo");
  const [deleteTarget, setDeleteTarget] = useState<Quotation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    dispatch(
      fetchQuotations({
        productType,
        search: searchTerm,
        field: searchField,
        page,
        limit: 6,
      })
    );
  }, [dispatch, productType, searchTerm, searchField, page]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await dispatch(deleteQuotation(deleteTarget.id)).unwrap();
      toast.success("Quotation deleted successfully");
      dispatch(fetchQuotations({ productType, search: searchTerm, field: searchField, page: 1, limit: 6 }));
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete");
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const filteredQuotations = useMemo(() => {
    return quotations;
  }, [quotations]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#1877F2] via-[#1877F2]/40 to-transparent" />

      {/* Search Bar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
        <div className="relative min-w-0 flex-1 sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search by quote ref, proposer name, group code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 transition-all focus:border-[#1877F2] focus:bg-white focus:ring-2 focus:ring-blue-500/15"
          />
        </div>
        <select
          value={searchField}
          onChange={(e) => setSearchField(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-600 outline-none transition-all focus:border-[#1877F2] cursor-pointer"
        >
          <option value="quotationRefNo">Quot. Ref No</option>
          <option value="proposerName">Proposer Name</option>
          <option value="groupCode">Group Code</option>
        </select>
      </div>

      {/* Content */}
      {isLoading && quotations.length === 0 ? (
        <div className="flex min-h-[18rem] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-[#1877F2]" />
        </div>
      ) : error && quotations.length === 0 ? (
        <QuotationEmptyState
          title="Failed to load quotations"
          description={error}
          action={
            <button
              onClick={() => dispatch(fetchQuotations({ productType, page: 1, limit: 6 }))}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#5c67ff] to-[#3a47ff] px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-200 transition-all hover:brightness-110 cursor-pointer"
            >
              Try Again
            </button>
          }
        />
      ) : filteredQuotations.length === 0 ? (
        <QuotationEmptyState
          title="No quotations found"
          description={
            searchTerm
              ? "No quotations match your search. Try a different keyword."
              : "Create your first quotation to get started."
          }
          action={
            !searchTerm ? (
              <button
                type="button"
                onClick={() => onOpenModal("create")}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#5c67ff] to-[#3a47ff] px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-200 transition-all hover:brightness-110 cursor-pointer"
              >
                <Plus size={16} />
                Add First Quotation
              </button>
            ) : undefined
          }
        />
      ) : (
        <QuotationTableFrame
          footer={
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>
                Showing <strong className="text-slate-700">{filteredQuotations.length}</strong> of{" "}
                <strong className="text-slate-700">{total}</strong> quotations
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => dispatch(fetchQuotations({ productType, search: searchTerm, field: searchField, page: 1, limit: 6 }))}
                  disabled={page === 1}
                  className="rounded px-2 py-1 font-bold text-slate-600 hover:bg-slate-200 disabled:opacity-30 cursor-pointer"
                >
                  |&lt;
                </button>
                <button
                  onClick={() => dispatch(fetchQuotations({ productType, search: searchTerm, field: searchField, page: Math.max(1, page - 1), limit: 6 }))}
                  disabled={page === 1}
                  className="rounded px-2 py-1 font-bold text-slate-600 hover:bg-slate-200 disabled:opacity-30 cursor-pointer"
                >
                  &lt;
                </button>
                <span className="rounded bg-blue-600 px-2.5 py-1 font-medium text-white">{page}</span>
                <button
                  onClick={() => dispatch(fetchQuotations({ productType, search: searchTerm, field: searchField, page: Math.min(totalPages, page + 1), limit: 6 }))}
                  disabled={page === totalPages || totalPages === 0}
                  className="rounded px-2 py-1 font-bold text-slate-600 hover:bg-slate-200 disabled:opacity-30 cursor-pointer"
                >
                  &gt;
                </button>
                <button
                  onClick={() => dispatch(fetchQuotations({ productType, search: searchTerm, field: searchField, page: totalPages, limit: 6 }))}
                  disabled={page === totalPages || totalPages === 0}
                  className="rounded px-2 py-1 font-bold text-slate-600 hover:bg-slate-200 disabled:opacity-30 cursor-pointer"
                >
                  &gt;|
                </button>
              </div>
            </div>
          }
        >
          <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr>
                <QuotationTableHeadCell>Quot. Ref No</QuotationTableHeadCell>
                <QuotationTableHeadCell>Date</QuotationTableHeadCell>
                <QuotationTableHeadCell>Product</QuotationTableHeadCell>
                <QuotationTableHeadCell>Proposer</QuotationTableHeadCell>
                <QuotationTableHeadCell>Sum Assured</QuotationTableHeadCell>
                <QuotationTableHeadCell>Premium</QuotationTableHeadCell>
                <QuotationTableHeadCell align="right">Actions</QuotationTableHeadCell>
              </tr>
            </thead>
            <tbody>
              {filteredQuotations.map((q, index) => (
                <tr
                  key={q.id}
                  onClick={() => onOpenModal("details", q.id)}
                  className={`group cursor-pointer border-b border-slate-100 transition-colors hover:bg-blue-50/40 ${
                    index % 2 === 0 ? "bg-white" : "bg-slate-50/30"
                  }`}
                >
                  <td className="px-4 py-4 align-top">
                    <span className="inline-flex rounded-lg bg-[#f1f5f9] px-3 py-1.5 font-mono text-xs font-semibold text-[#475569]">
                      {q.quotationRefNo}
                    </span>
                  </td>
                  <td className="px-4 py-4 align-top text-sm text-slate-600">
                    {formatDate(q.quotationDate)}
                  </td>
                  <td className="px-4 py-4 align-top">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                      {PRODUCT_LABELS[q.productType] || q.productType}
                    </span>
                  </td>
                  <td className="px-4 py-4 align-top">
                    <div className="flex items-start gap-3 text-left">
                      <Seal name={q.proposerName} size={36} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-900 transition-colors group-hover:text-[#1877F2]">
                            {q.proposerName}
                          </span>
                          <ChevronRight
                            size={13}
                            className="text-[#1877F2] opacity-0 transition-opacity group-hover:opacity-100"
                          />
                        </div>
                        <div className="mt-0.5 text-xs text-slate-400">
                          {q.age} Yrs | {q.gender}
                          {q.groupCode && ` | ${q.groupCode}`}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 align-top font-bold text-slate-900">
                    {formatCurrency(q.sumAssured)}
                  </td>
                  <td className="px-4 py-4 align-top font-black text-emerald-700">
                    {formatCurrency(q.installmentPremium || q.totalPremium)}
                  </td>
                  <td className="px-4 py-4 text-right align-top">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenModal("details", q.id);
                        }}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-[#1877F2] hover:scale-105 cursor-pointer"
                        title="View"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenModal("edit", q.id);
                        }}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-blue-100 bg-white text-[#1877F2] transition-all hover:border-blue-300 hover:bg-blue-50 hover:scale-105 cursor-pointer"
                        title="Edit"
                      >
                        <SquarePen size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewReport(q.id);
                        }}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-blue-100 bg-white text-[#1877F2] transition-all hover:border-blue-300 hover:bg-blue-50 hover:scale-105 cursor-pointer"
                        title="View Report"
                      >
                        <FileText size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(q);
                        }}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-rose-100 bg-white text-rose-600 transition-all hover:border-rose-300 hover:bg-rose-50 hover:scale-105 cursor-pointer"
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
        </QuotationTableFrame>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.28)]">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                <Trash2 size={18} />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-slate-900">Delete Quotation</h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  This will permanently remove the quotation and all its calculation details.
                </p>
                <p className="mt-2 text-sm font-medium text-slate-700">
                  {deleteTarget.quotationRefNo} — {deleteTarget.proposerName}
                </p>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
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
