"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  Filter,
  Plus,
  MoreVertical,
  Eye,
  Trash2,
  Copy,
  FileSpreadsheet,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { AppDispatch, RootState } from "@/store/store";
import {
  fetchQuotations,
  deleteQuotation,
  saveQuotation,
} from "../quotationSlice";
import { Quotation, QuotationProductType, ReportOptionsState } from "../types";

interface QuotationListProps {
  productType: QuotationProductType;
  onAddNew: () => void;
  onViewReport: (quotation: Quotation, reportOptions: ReportOptionsState) => void;
}

export const QuotationList: React.FC<QuotationListProps> = ({
  productType,
  onAddNew,
  onViewReport,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { quotations, total, page, limit, totalPages, isLoading } = useSelector(
    (state: RootState) => state.quotations
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [searchField, setSearchField] = useState("quotationRefNo");
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Default report options based on product
  const [reportOptions, setReportOptions] = useState<ReportOptionsState>(() => {
    if (productType === "LIFE_GUARD") {
      return {
        coverPage: true,
        benefitsIllustration: true,
        agentsCopy: true,
        taxBreakup: true,
        medicalRequirement: true,
        yield: true,
      };
    }
    return {
      coverPage: true,
      benefitsForecast: true,
      agentsCopy: true,
      medicalRequirement: true,
      yield: false,
    };
  });

  useEffect(() => {
    if (productType === "LIFE_GUARD") {
      setReportOptions({
        coverPage: true,
        benefitsIllustration: true,
        agentsCopy: true,
        taxBreakup: true,
        medicalRequirement: true,
        yield: true,
      });
    } else {
      setReportOptions({
        coverPage: true,
        benefitsForecast: true,
        agentsCopy: true,
        medicalRequirement: true,
        yield: false,
      });
    }
  }, [productType]);

  // Fetch list on mount and whenever productType or search changes
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(
      fetchQuotations({
        productType,
        search: searchTerm,
        field: searchField,
        page: 1,
        limit: 6,
      })
    );
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this quotation?")) {
      const toastId = toast.loading("Deleting quotation...");
      const res: any = await dispatch(deleteQuotation(id));
      if (deleteQuotation.fulfilled.match(res)) {
        toast.success("Quotation deleted successfully!", { id: toastId });
        dispatch(
          fetchQuotations({
            productType,
            search: searchTerm,
            field: searchField,
            page: 1,
            limit: 6,
          })
        );
      } else {
        toast.error("Failed to delete quotation", { id: toastId });
      }
      setActiveMenuId(null);
    }
  };

  const handleDuplicate = async (quotation: Quotation) => {
    const toastId = toast.loading("Duplicating quotation...");
    const { id, quotationRefNo, createdAt, updatedAt, ...cloneData } = quotation;
    const res: any = await dispatch(
      saveQuotation({
        ...cloneData,
        quotationRefNo: "", // trigger next ref generation
      })
    );
    if (saveQuotation.fulfilled.match(res)) {
      toast.success("Quotation duplicated successfully!", { id: toastId });
      dispatch(
        fetchQuotations({
          productType,
          search: searchTerm,
          field: searchField,
          page: 1,
          limit: 6,
        })
      );
    } else {
      toast.error("Failed to duplicate quotation", { id: toastId });
    }
    setActiveMenuId(null);
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, "0");
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    return `${day}/${months[date.getMonth()]}/${date.getFullYear()}`;
  };

  const formatCurrency = (val?: number | null) => {
    if (val === undefined || val === null) return "₹ 0";
    return `₹ ${Number(val).toLocaleString("en-IN")}`;
  };

  return (
    <div className="w-full space-y-6">
      {/* Search & Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-2.5 flex-1">
          <div className="relative min-w-[240px] max-w-md flex-1">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by quote ref, proposer name..."
              className="w-full pl-3.5 pr-9 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white"
            />
            <Search
              size={16}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">In</span>
            <select
              value={searchField}
              onChange={(e) => setSearchField(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white text-slate-700 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            >
              <option value="quotationRefNo">Quot. Ref No</option>
              <option value="proposerName">Proposer Name</option>
              <option value="groupCode">Group Code</option>
            </select>

            <button
              type="submit"
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg border border-slate-200 transition-colors cursor-pointer"
            >
              <Filter size={16} />
            </button>
          </div>
        </form>

        <button
          onClick={onAddNew}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all cursor-pointer"
        >
          <Plus size={16} className="stroke-[3]" /> Add Quotation
        </button>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[340px] flex flex-col justify-between">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border-b border-blue-100">
                <th className="py-3 px-4 font-bold text-blue-950 uppercase tracking-wider">
                  Quot. Ref No
                </th>
                <th className="py-3 px-4 font-bold text-blue-950 uppercase tracking-wider">
                  Date
                </th>
                <th className="py-3 px-4 font-bold text-blue-950 uppercase tracking-wider">
                  Name of Proposer
                </th>
                <th className="py-3 px-4 font-bold text-blue-950 uppercase tracking-wider">
                  Date of Birth
                </th>
                <th className="py-3 px-4 font-bold text-blue-950 uppercase tracking-wider">
                  Sum Assured
                </th>
                <th className="py-3 px-4 font-bold text-blue-950 uppercase tracking-wider">
                  Premium
                </th>
                <th className="py-3 px-4 font-bold text-blue-950 text-right w-16">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-500">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mb-2"></div>
                    <p className="text-xs font-medium">Loading quotations...</p>
                  </td>
                </tr>
              ) : quotations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center text-slate-500">
                    <div className="max-w-sm mx-auto space-y-3">
                      <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                        <FileSpreadsheet size={24} />
                      </div>
                      <p className="text-sm font-semibold text-slate-800">
                        No quotations created yet
                      </p>
                      <p className="text-xs text-slate-500">
                        Click{" "}
                        <button
                          onClick={onAddNew}
                          className="text-blue-600 font-bold hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                        >
                          <Plus size={14} /> Add New
                        </button>{" "}
                        to calculate and generate your first quotation.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                quotations.map((q) => (
                  <tr
                    key={q.id}
                    className="hover:bg-blue-50/40 transition-colors text-slate-800"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-900">
                      {q.quotationRefNo}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {formatDate(q.quotationDate)}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {q.proposerName}
                      {q.groupCode && (
                        <span className="ml-1.5 text-[10px] text-slate-400 font-normal">
                          ({q.groupCode})
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {formatDate(q.dateOfBirth)}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {formatCurrency(q.sumAssured)}
                    </td>
                    <td className="py-3.5 px-4 font-black text-emerald-700">
                      {formatCurrency(q.installmentPremium || q.totalPremium)}
                    </td>
                    <td className="py-3.5 px-4 text-right relative">
                      <button
                        onClick={() =>
                          setActiveMenuId(activeMenuId === q.id ? null : q.id)
                        }
                        className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      >
                        <MoreVertical size={16} />
                      </button>

                      {/* Dropdown Action Menu */}
                      {activeMenuId === q.id && (
                        <div className="absolute right-4 top-10 z-20 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 text-left animate-in fade-in zoom-in-95 duration-100">
                          <button
                            onClick={() => {
                              onViewReport(q, reportOptions);
                              setActiveMenuId(null);
                            }}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 cursor-pointer"
                          >
                            <Eye size={15} className="text-blue-600" /> View / Download Report
                          </button>
                          <button
                            onClick={() => handleDuplicate(q)}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 cursor-pointer"
                          >
                            <Copy size={15} className="text-slate-500" /> Duplicate Quotation
                          </button>
                          <button
                            onClick={() => handleDelete(q.id)}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 cursor-pointer"
                          >
                            <Trash2 size={15} /> Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-end gap-6 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span className="font-medium">Items per page:</span>
            <span className="bg-white border border-slate-300 rounded px-2 py-0.5 font-bold">
              6
            </span>
          </div>

          <div className="font-medium">
            {total > 0
              ? `${(page - 1) * limit + 1} - ${Math.min(page * limit, total)} of ${total}`
              : "0 of 0"}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() =>
                dispatch(
                  fetchQuotations({
                    productType,
                    search: searchTerm,
                    field: searchField,
                    page: 1,
                    limit: 6,
                  })
                )
              }
              disabled={page === 1}
              className="p-1 px-2 disabled:opacity-30 hover:bg-slate-200 rounded font-bold cursor-pointer"
            >
              |&lt;
            </button>
            <button
              onClick={() =>
                dispatch(
                  fetchQuotations({
                    productType,
                    search: searchTerm,
                    field: searchField,
                    page: Math.max(1, page - 1),
                    limit: 6,
                  })
                )
              }
              disabled={page === 1}
              className="p-1 px-2 disabled:opacity-30 hover:bg-slate-200 rounded font-bold cursor-pointer"
            >
              &lt;
            </button>
            <button
              onClick={() =>
                dispatch(
                  fetchQuotations({
                    productType,
                    search: searchTerm,
                    field: searchField,
                    page: Math.min(totalPages, page + 1),
                    limit: 6,
                  })
                )
              }
              disabled={page === totalPages || totalPages === 0}
              className="p-1 px-2 disabled:opacity-30 hover:bg-slate-200 rounded font-bold cursor-pointer"
            >
              &gt;
            </button>
            <button
              onClick={() =>
                dispatch(
                  fetchQuotations({
                    productType,
                    search: searchTerm,
                    field: searchField,
                    page: totalPages,
                    limit: 6,
                  })
                )
              }
              disabled={page === totalPages || totalPages === 0}
              className="p-1 px-2 disabled:opacity-30 hover:bg-slate-200 rounded font-bold cursor-pointer"
            >
              &gt;|
            </button>
          </div>
        </div>
      </div>

      {/* Report Options Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="bg-slate-50 px-5 py-3 border-b border-slate-200">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Report Sections Included in PDF / Print
          </h3>
        </div>

        <div className="p-5 flex flex-wrap items-center gap-x-8 gap-y-3">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={reportOptions.coverPage}
              onChange={(e) =>
                setReportOptions({ ...reportOptions, coverPage: e.target.checked })
              }
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
            />
            Cover Page
          </label>

          {productType === "LIFE_GUARD" ? (
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={reportOptions.benefitsIllustration ?? true}
                onChange={(e) =>
                  setReportOptions({
                    ...reportOptions,
                    benefitsIllustration: e.target.checked,
                  })
                }
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
              />
              Benefits Illustration
            </label>
          ) : (
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={reportOptions.benefitsForecast ?? true}
                onChange={(e) =>
                  setReportOptions({
                    ...reportOptions,
                    benefitsForecast: e.target.checked,
                  })
                }
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
              />
              Benefits Forecast
            </label>
          )}

          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={reportOptions.agentsCopy}
              onChange={(e) =>
                setReportOptions({ ...reportOptions, agentsCopy: e.target.checked })
              }
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
            />
            Agent&apos;s Copy
          </label>

          {productType === "LIFE_GUARD" && (
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={reportOptions.taxBreakup ?? true}
                onChange={(e) =>
                  setReportOptions({
                    ...reportOptions,
                    taxBreakup: e.target.checked,
                  })
                }
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
              />
              Tax Breakup
            </label>
          )}

          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={reportOptions.medicalRequirement}
              onChange={(e) =>
                setReportOptions({
                  ...reportOptions,
                  medicalRequirement: e.target.checked,
                })
              }
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
            />
            Medical Requirement
          </label>

          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={reportOptions.yield}
              onChange={(e) =>
                setReportOptions({ ...reportOptions, yield: e.target.checked })
              }
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
            />
            Yield
          </label>
        </div>
      </div>
    </div>
  );
};
