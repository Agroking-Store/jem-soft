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
  ArrowUpDown,
  FileSpreadsheet,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
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
      await dispatch(deleteQuotation(id));
      setActiveMenuId(null);
    }
  };

  const handleDuplicate = async (quotation: Quotation) => {
    const { id, quotationRefNo, createdAt, updatedAt, ...cloneData } = quotation;
    await dispatch(
      saveQuotation({
        ...cloneData,
        quotationRefNo: "", // trigger next ref generation
      })
    );
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
      {/* Top Search and Add Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
        <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative min-w-[220px] max-w-sm flex-1">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search..."
              className="w-full pl-3 pr-9 py-1.5 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
            />
            <Search
              size={18}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-blue-600"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">In</span>
            <select
              value={searchField}
              onChange={(e) => setSearchField(e.target.value)}
              className="px-3 py-1.5 text-sm border border-slate-300 rounded bg-white text-slate-700 font-medium"
            >
              <option value="quotationRefNo">Quot. Ref No</option>
              <option value="proposerName">Proposer Name</option>
              <option value="groupCode">Group Code</option>
            </select>

            <button
              type="button"
              className="p-2 text-blue-600 hover:bg-blue-50 rounded"
            >
              <Filter size={18} />
            </button>
          </div>
        </form>

        <button
          onClick={onAddNew}
          className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold text-blue-700 hover:text-blue-900 transition-colors"
        >
          Add Quotation <Plus size={18} className="stroke-[2.5]" />
        </button>
      </div>

      {/* Quotation Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden min-h-[300px] flex flex-col justify-between">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200">
                <th className="py-2.5 px-4 font-semibold text-blue-950 flex items-center gap-1">
                  Quot. Ref No <ArrowUpDown size={14} />
                </th>
                <th className="py-2.5 px-4 font-semibold text-blue-950">Date</th>
                <th className="py-2.5 px-4 font-semibold text-blue-950">
                  Name of Proposer
                </th>
                <th className="py-2.5 px-4 font-semibold text-blue-950">
                  Date of Birth
                </th>
                <th className="py-2.5 px-4 font-semibold text-blue-950">
                  Sum Assured
                </th>
                <th className="py-2.5 px-4 font-semibold text-blue-950">Premium</th>
                <th className="py-2.5 px-4 font-semibold text-blue-950 text-right w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-500">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mb-2"></div>
                    <p className="text-sm">Loading quotations...</p>
                  </td>
                </tr>
              ) : quotations.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-20 text-center text-slate-600 font-medium"
                  >
                    Click{" "}
                    <button
                      onClick={onAddNew}
                      className="text-blue-600 font-semibold hover:underline inline-flex items-center gap-0.5 mx-1"
                    >
                      <Plus size={16} /> Add New
                    </button>{" "}
                    for Inserting new Quotation
                  </td>
                </tr>
              ) : (
                quotations.map((q) => (
                  <tr
                    key={q.id}
                    className="hover:bg-blue-50/40 transition-colors text-slate-800"
                  >
                    <td className="py-3 px-4 font-mono font-medium text-blue-900">
                      {q.quotationRefNo}
                    </td>
                    <td className="py-3 px-4">
                      {formatDate(q.quotationDate)}
                    </td>
                    <td className="py-3 px-4 font-medium">
                      {q.proposerName}
                    </td>
                    <td className="py-3 px-4">
                      {formatDate(q.dateOfBirth)}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {formatCurrency(q.sumAssured)}
                    </td>
                    <td className="py-3 px-4 font-semibold text-emerald-700">
                      {formatCurrency(q.installmentPremium || q.totalPremium)}
                    </td>
                    <td className="py-3 px-4 text-right relative">
                      <button
                        onClick={() =>
                          setActiveMenuId(activeMenuId === q.id ? null : q.id)
                        }
                        className="p-1 text-blue-700 hover:bg-slate-100 rounded-full"
                      >
                        <MoreVertical size={18} />
                      </button>

                      {/* Dropdown Action Menu */}
                      {activeMenuId === q.id && (
                        <div className="absolute right-4 top-10 z-20 w-44 bg-white rounded-lg shadow-xl border border-slate-200 py-1 text-left">
                          <button
                            onClick={() => {
                              onViewReport(q, reportOptions);
                              setActiveMenuId(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                          >
                            <Eye size={15} /> View Report
                          </button>
                          <button
                            onClick={() => handleDuplicate(q)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                          >
                            <Copy size={15} /> Duplicate
                          </button>
                          <button
                            onClick={() => handleDelete(q.id)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
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
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50/50 flex flex-wrap items-center justify-end gap-6 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span>Items per page:</span>
            <select
              value={limit}
              disabled
              className="bg-white border border-slate-300 rounded px-2 py-1 text-xs font-semibold"
            >
              <option value="6">6</option>
            </select>
          </div>

          <div>
            {total > 0
              ? `${(page - 1) * limit + 1} - ${Math.min(page * limit, total)} of ${total}`
              : "0 of 0"}
          </div>

          <div className="flex items-center gap-2">
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
              className="p-1 disabled:opacity-30 hover:bg-slate-200 rounded"
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
              className="p-1 disabled:opacity-30 hover:bg-slate-200 rounded"
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
              className="p-1 disabled:opacity-30 hover:bg-slate-200 rounded"
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
              className="p-1 disabled:opacity-30 hover:bg-slate-200 rounded"
            >
              &gt;|
            </button>
          </div>
        </div>
      </div>

      {/* Report Options Checkboxes Card */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-2 border-b border-blue-200">
          <h3 className="text-sm font-bold text-blue-900">Report Options</h3>
        </div>

        <div className="p-4 flex flex-wrap items-center gap-x-8 gap-y-3">
          <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-800">
            <input
              type="checkbox"
              checked={reportOptions.coverPage}
              onChange={(e) =>
                setReportOptions({ ...reportOptions, coverPage: e.target.checked })
              }
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
            />
            Cover Page
          </label>

          {productType === "LIFE_GUARD" ? (
            <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-800">
              <input
                type="checkbox"
                checked={reportOptions.benefitsIllustration ?? true}
                onChange={(e) =>
                  setReportOptions({
                    ...reportOptions,
                    benefitsIllustration: e.target.checked,
                  })
                }
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
              />
              Benefits Illustration
            </label>
          ) : (
            <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-800">
              <input
                type="checkbox"
                checked={reportOptions.benefitsForecast ?? true}
                onChange={(e) =>
                  setReportOptions({
                    ...reportOptions,
                    benefitsForecast: e.target.checked,
                  })
                }
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
              />
              Benefits Forecast
            </label>
          )}

          <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-800">
            <input
              type="checkbox"
              checked={reportOptions.agentsCopy}
              onChange={(e) =>
                setReportOptions({ ...reportOptions, agentsCopy: e.target.checked })
              }
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
            />
            Agent&apos;s Copy
          </label>

          {productType === "LIFE_GUARD" && (
            <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-800">
              <input
                type="checkbox"
                checked={reportOptions.taxBreakup ?? true}
                onChange={(e) =>
                  setReportOptions({
                    ...reportOptions,
                    taxBreakup: e.target.checked,
                  })
                }
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
              />
              Tax Breakup
            </label>
          )}

          <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-800">
            <input
              type="checkbox"
              checked={reportOptions.medicalRequirement}
              onChange={(e) =>
                setReportOptions({
                  ...reportOptions,
                  medicalRequirement: e.target.checked,
                })
              }
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
            />
            Medical Requirement
          </label>

          <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-800">
            <input
              type="checkbox"
              checked={reportOptions.yield}
              onChange={(e) =>
                setReportOptions({ ...reportOptions, yield: e.target.checked })
              }
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
            />
            Yield
          </label>
        </div>
      </div>
    </div>
  );
};
