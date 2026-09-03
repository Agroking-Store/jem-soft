"use client";

import { useState, useMemo, useEffect } from "react";
import { X, Search, Trash2, Shield, CheckSquare, Square, Check } from "lucide-react";
import { getCustomerFullName } from "./commReportsUtils";

export interface CommissionPolicyFilterSelection {
  filterType: "Policies" | "Agent Bill Wise" | "Interest Date Wise";
  selectedIds: string[];
  selectedItems: Array<{
    id: string;
    col1: string; // Policy No
    col2: string; // Policy Holder
    agentName?: string;
    premium?: number;
    plan?: string;
  }>;
}

interface CommissionPolicyFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  policies: Array<any>;
  selectedAgencyFilters?: string[];
  selectedFilters: CommissionPolicyFilterSelection | null;
  onApplyFilters: (selection: CommissionPolicyFilterSelection) => void;
}

const JAYANT_ADVISOR_CODES = ["a001", "a002", "a003"];
const MANISHA_ADVISOR_CODES = ["a004", "a005", "a006"];

export default function CommissionPolicyFilterModal({
  isOpen,
  onClose,
  policies = [],
  selectedAgencyFilters = [],
  selectedFilters: initialSelection,
  onApplyFilters,
}: CommissionPolicyFilterModalProps) {
  const [searchText, setSearchText] = useState("");
  const [selectedItems, setSelectedItems] = useState<
    Array<{
      id: string;
      col1: string;
      col2: string;
      agentName?: string;
      premium?: number;
      plan?: string;
    }>
  >([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Sync selected items with props whenever modal opens or initialSelection changes
  useEffect(() => {
    if (isOpen) {
      setSelectedItems(initialSelection?.selectedItems ? [...initialSelection.selectedItems] : []);
      setSearchText("");
      setCurrentPage(1);
    }
  }, [isOpen, initialSelection]);

  // 1. Filter policies by selected agency/agent filter(s)
  const isAgencyMatch = (p: any, filters: string[]) => {
    if (!filters || filters.length === 0) return true;

    const pAgCode = (p.agentCode || "").toLowerCase().trim();
    const pAdvCode = (p.advisor?.advisorCode || "").toLowerCase().trim();
    const pAdvName = (p.advisor?.advisorName || "").toLowerCase().trim();

    return filters.some((f) => {
      const fLower = f.toLowerCase().trim();
      if (!fLower) return true;

      // Jayant Mahabole (AG002)
      if (fLower.includes("jayant") || fLower.includes("ag002")) {
        return (
          JAYANT_ADVISOR_CODES.includes(pAgCode) ||
          JAYANT_ADVISOR_CODES.includes(pAdvCode) ||
          pAdvName.includes("jayant")
        );
      }

      // Manisha Y Mahabole (AG003)
      if (fLower.includes("manisha") || fLower.includes("ag003")) {
        return (
          MANISHA_ADVISOR_CODES.includes(pAgCode) ||
          MANISHA_ADVISOR_CODES.includes(pAdvCode) ||
          pAdvName.includes("manisha")
        );
      }

      // Other Agencies (AG001)
      if (fLower.includes("other") || fLower.includes("ag001")) {
        return (
          !JAYANT_ADVISOR_CODES.includes(pAgCode) &&
          !MANISHA_ADVISOR_CODES.includes(pAgCode) &&
          !JAYANT_ADVISOR_CODES.includes(pAdvCode) &&
          !MANISHA_ADVISOR_CODES.includes(pAdvCode)
        );
      }

      // Direct fallback
      return pAgCode.includes(fLower) || pAdvCode.includes(fLower) || pAdvName.includes(fLower);
    });
  };

  const eligiblePolicies = useMemo(() => {
    if (!policies || policies.length === 0) return [];
    if (!selectedAgencyFilters || selectedAgencyFilters.length === 0) {
      return policies;
    }
    return policies.filter((p) => isAgencyMatch(p, selectedAgencyFilters));
  }, [policies, selectedAgencyFilters]);

  // 2. Prepare structured list
  const masterDataList = useMemo(() => {
    const list: Array<{
      id: string;
      col1: string;
      col2: string;
      agentName?: string;
      premium?: number;
      plan?: string;
    }> = [];

    eligiblePolicies.forEach((p, idx) => {
      const polNo = p.policyNumber || p.policyNo || `POL-${idx + 1}`;
      const holder =
        getCustomerFullName(p.CustomerMaster) !== "-"
          ? getCustomerFullName(p.CustomerMaster)
          : p.customer?.groupName || p.customer?.name || "Customer";

      const agentName = p.advisor?.advisorName
        ? `${p.advisor.advisorName}${p.advisor.advisorCode ? ` (${p.advisor.advisorCode})` : ""}`
        : p.agentCode
        ? `Agent: ${p.agentCode}`
        : "Direct";

      const premium = Number(
        p.premium?.installmentPremium ||
          p.premium?.totalInstallmentPremium ||
          p.premium?.totalYearlyPremium ||
          p.premiumAmount ||
          0
      );

      const plan = p.product?.planNumber
        ? `Table ${p.product.planNumber}`
        : p.product?.productName || "-";

      const id = String(p.id || idx);

      if (!list.find((item) => item.id === id)) {
        list.push({
          id,
          col1: polNo,
          col2: holder,
          agentName,
          premium,
          plan,
        });
      }
    });

    return list;
  }, [eligiblePolicies]);

  // 3. Search filter
  const filteredList = useMemo(() => {
    const query = searchText.toLowerCase().trim();
    if (!query) return masterDataList;
    return masterDataList.filter(
      (item) =>
        item.col1.toLowerCase().includes(query) ||
        item.col2.toLowerCase().includes(query) ||
        (item.agentName && item.agentName.toLowerCase().includes(query)) ||
        (item.plan && item.plan.toLowerCase().includes(query))
    );
  }, [masterDataList, searchText]);

  const totalPages = Math.ceil(filteredList.length / pageSize) || 1;

  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, currentPage]);

  const isAllSelectedOnPage =
    paginatedList.length > 0 &&
    paginatedList.every((item) => selectedItems.some((s) => s.id === item.id));

  const isAllSelectedOverall =
    filteredList.length > 0 &&
    filteredList.every((item) => selectedItems.some((s) => s.id === item.id));

  const toggleSelectAllOnPage = () => {
    if (isAllSelectedOnPage) {
      setSelectedItems((prev) =>
        prev.filter((s) => !paginatedList.some((p) => p.id === s.id))
      );
    } else {
      const newAdditions = paginatedList.filter(
        (item) => !selectedItems.some((s) => s.id === item.id)
      );
      setSelectedItems((prev) => [...prev, ...newAdditions]);
    }
  };

  const toggleSelectAllOverall = () => {
    if (isAllSelectedOverall) {
      setSelectedItems((prev) =>
        prev.filter((s) => !filteredList.some((p) => p.id === s.id))
      );
    } else {
      const newAdditions = filteredList.filter(
        (item) => !selectedItems.some((s) => s.id === item.id)
      );
      setSelectedItems((prev) => [...prev, ...newAdditions]);
    }
  };

  const toggleItem = (item: {
    id: string;
    col1: string;
    col2: string;
    agentName?: string;
    premium?: number;
    plan?: string;
  }) => {
    const exists = selectedItems.some((s) => s.id === item.id);
    if (exists) {
      setSelectedItems((prev) => prev.filter((s) => s.id !== item.id));
    } else {
      setSelectedItems((prev) => [...prev, item]);
    }
  };

  const removeItem = (id: string) => {
    setSelectedItems((prev) => prev.filter((s) => s.id !== id));
  };

  const clearAllSelected = () => {
    setSelectedItems([]);
  };

  const handleApply = () => {
    onApplyFilters({
      filterType: "Policies",
      selectedIds: selectedItems.map((s) => s.id),
      selectedItems: selectedItems,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Top Accent Line */}
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#1877F2] via-[#2563eb] to-transparent" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-b from-[#1e3a8a] to-[#2563eb] text-white shadow-sm">
              <Shield size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Select Policies
              </h2>
              <p className="text-xs text-slate-500">
                {selectedAgencyFilters.length > 0
                  ? `Filtered by agency (${selectedAgencyFilters.join(", ")}) — ${eligiblePolicies.length} available policies`
                  : `Showing all available policies (${eligiblePolicies.length} total)`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search & Bulk Selection Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-3 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={toggleSelectAllOverall}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-[#1877F2] hover:border-blue-200 transition"
            >
              {isAllSelectedOverall ? (
                <>
                  <CheckSquare size={14} className="text-[#1877F2]" />
                  Deselect All ({filteredList.length})
                </>
              ) : (
                <>
                  <Square size={14} />
                  Select All ({filteredList.length})
                </>
              )}
            </button>

            {selectedItems.length > 0 && (
              <button
                type="button"
                onClick={clearAllSelected}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-rose-100 bg-rose-50 text-xs font-semibold text-rose-600 hover:bg-rose-100 transition"
              >
                <Trash2 size={13} />
                Clear Selection ({selectedItems.length})
              </button>
            )}
          </div>

          <div className="relative w-full sm:w-80">
            <input
              type="text"
              placeholder="Search by policy no, holder, plan..."
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#1877F2] focus:ring-2 focus:ring-blue-500/15 transition"
            />
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-hidden min-h-[380px]">
          {/* Table of Policies */}
          <div className="md:col-span-8 border-r border-slate-200 flex flex-col justify-between p-4 bg-white">
            <div className="overflow-y-auto border border-slate-200 rounded-xl shadow-xs h-[340px]">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
                  <tr>
                    <th className="w-12 px-3 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={isAllSelectedOnPage}
                        onChange={toggleSelectAllOnPage}
                        className="w-4 h-4 text-[#1877F2] rounded border-slate-300 focus:ring-[#1877F2] cursor-pointer"
                      />
                    </th>
                    <th className="px-3 py-3 font-bold uppercase tracking-wider text-slate-500 text-[11px]">
                      Policy No
                    </th>
                    <th className="px-3 py-3 font-bold uppercase tracking-wider text-slate-500 text-[11px]">
                      Policy Holder
                    </th>
                    <th className="px-3 py-3 font-bold uppercase tracking-wider text-slate-500 text-[11px]">
                      Agent / Plan
                    </th>
                    <th className="px-3 py-3 font-bold uppercase tracking-wider text-slate-500 text-[11px] text-right">
                      Premium
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedList.map((item, idx) => {
                    const isChecked = selectedItems.some((s) => s.id === item.id);
                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-blue-50/40 transition cursor-pointer ${
                          isChecked ? "bg-blue-50/30" : idx % 2 === 0 ? "bg-white" : "bg-slate-50/20"
                        }`}
                        onClick={() => toggleItem(item)}
                      >
                        <td className="px-3 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleItem(item)}
                            className="w-4 h-4 text-[#1877F2] rounded border-slate-300 focus:ring-[#1877F2] cursor-pointer"
                          />
                        </td>
                        <td className="px-3 py-2.5 font-bold font-mono text-slate-900">
                          {item.col1}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="font-semibold text-slate-800">{item.col2}</div>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="text-slate-600 font-medium">{item.plan}</div>
                          {item.agentName && (
                            <div className="text-[10px] text-slate-400">{item.agentName}</div>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right font-semibold text-slate-800">
                          {item.premium && item.premium > 0 ? `₹${item.premium.toLocaleString("en-IN")}` : "-"}
                        </td>
                      </tr>
                    );
                  })}
                  {paginatedList.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-1">
                          <Shield size={28} className="text-slate-300" />
                          <p className="font-medium text-slate-600 mt-1">No policies found</p>
                          <p className="text-xs text-slate-400">
                            {selectedAgencyFilters.length > 0
                              ? "No policies linked to the selected agency."
                              : "No policy records available."}
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between pt-3 text-xs text-slate-600">
              <span className="font-medium text-slate-500">
                {filteredList.length > 0
                  ? `Showing ${(currentPage - 1) * pageSize + 1} - ${Math.min(
                      currentPage * pageSize,
                      filteredList.length
                    )} of ${filteredList.length} policies`
                  : "0 policies"}
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(1)}
                  className="px-2.5 py-1 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 font-medium"
                >
                  «
                </button>
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className="px-2.5 py-1 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 font-medium"
                >
                  Prev
                </button>
                <span className="px-3 py-1 bg-[#f0f7ff] text-[#1877F2] border border-blue-200 rounded-lg font-bold">
                  {currentPage} / {totalPages}
                </span>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="px-2.5 py-1 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 font-medium"
                >
                  Next
                </button>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  className="px-2.5 py-1 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 font-medium"
                >
                  »
                </button>
              </div>
            </div>
          </div>

          {/* Selected Summary Sidebar */}
          <div className="md:col-span-4 p-4 flex flex-col justify-between bg-slate-50/50">
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white h-full flex flex-col shadow-xs">
              <div className="bg-slate-100/80 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-700">
                <span>Selected Policies</span>
                <span className="inline-flex items-center justify-center rounded-full bg-[#1877F2] text-white px-2 py-0.5 text-[10px]">
                  {selectedItems.length}
                </span>
              </div>
              <div className="p-3 flex-1 overflow-y-auto space-y-2 max-h-[300px]">
                {selectedItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-center">
                    <CheckSquare size={24} className="text-slate-300 mb-1" />
                    <p className="text-xs italic">No policies selected</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      (All filtered policies will be included by default)
                    </p>
                  </div>
                ) : (
                  selectedItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between border border-slate-200 rounded-xl p-2.5 bg-white text-xs hover:border-blue-300 transition shadow-2xs"
                    >
                      <div className="flex flex-col truncate pr-2">
                        <span className="font-bold font-mono text-slate-900">{item.col1}</span>
                        <span className="text-slate-600 text-[11px] truncate">{item.col2}</span>
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition shrink-0"
                        title="Remove"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 border border-slate-200 bg-white text-slate-700 font-semibold text-xs rounded-xl hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#5c67ff] to-[#3a47ff] text-white font-semibold text-xs rounded-xl shadow-md shadow-blue-200 hover:brightness-110 active:scale-[0.98] transition"
          >
            <Check size={16} />
            Apply Selection ({selectedItems.length || "All"})
          </button>
        </div>
      </div>
    </div>
  );
}