"use client";

import { useState, useMemo } from "react";
import { X, Search, Trash2, ChevronDown } from "lucide-react";

export interface CommissionPolicyFilterSelection {
  filterType: "Policies" | "Agent Bill Wise" | "Interest Date Wise";
  selectedIds: string[];
  selectedItems: Array<{ id: string; col1: string; col2: string }>;
}

interface CommissionPolicyFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Array<any>;
  policies: Array<any>;
  selectedFilters: CommissionPolicyFilterSelection | null;
  onApplyFilters: (selection: CommissionPolicyFilterSelection) => void;
}

export default function CommissionPolicyFilterModal({
  isOpen,
  onClose,
  customers = [],
  policies = [],
  selectedFilters: initialSelection,
  onApplyFilters,
}: CommissionPolicyFilterModalProps) {
  const [filterType, setFilterType] = useState<"Policies" | "Agent Bill Wise" | "Interest Date Wise">(
    initialSelection?.filterType || "Policies"
  );
  const [searchText, setSearchText] = useState("");
  const [selectedItems, setSelectedItems] = useState<
    Array<{ id: string; col1: string; col2: string }>
  >(initialSelection?.selectedItems || []);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 9;

  // Title and Column Configuration based on selected filterType
  const modalConfig = useMemo(() => {
    switch (filterType) {
      case "Policies":
        return {
          col1: "Policy No",
          col2: "Policy Holder",
        };
      case "Agent Bill Wise":
        return {
          col1: "Agent Bill",
          col2: "Details",
        };
      case "Interest Date Wise":
        return {
          col1: "Interest Date",
          col2: "Details",
        };
      default:
        return {
          col1: "Policy No",
          col2: "Policy Holder",
        };
    }
  }, [filterType]);

  const masterDataList = useMemo(() => {
    const data: Array<{ id: string; col1: string; col2: string }> = [];
    
    if (filterType === "Policies") {
      policies.forEach((p, idx) => {
        // Only include if actual policyNo exists
        if (p.policyNo) {
          const holder = p.CustomerMaster?.name || p.CustomerMasterId || "Unknown";
          if (!data.find(d => d.id === p.id)) {
            data.push({ id: p.id || String(idx), col1: p.policyNo, col2: holder });
          }
        }
      });
    } else if (filterType === "Agent Bill Wise") {
      // Typically agent bills would be mapped here, but no specific bill data is given.
      // Extract unique agents from policies for now.
      const agentMap = new Map();
      policies.forEach(p => {
        if (p.agentCode && !agentMap.has(p.agentCode)) {
          agentMap.set(p.agentCode, { id: p.agentCode, col1: `Bill for ${p.agentCode}`, col2: `Agent ${p.agentCode}` });
        }
      });
      data.push(...Array.from(agentMap.values()));
    } else if (filterType === "Interest Date Wise") {
      // Unique interest dates (using commencement as fallback)
      const dateMap = new Map();
      policies.forEach(p => {
        if (p.commencementDate) {
          const d = new Date(p.commencementDate).toLocaleDateString("en-GB");
          if (!dateMap.has(d)) {
            dateMap.set(d, { id: d, col1: d, col2: "Interest Details" });
          }
        }
      });
      data.push(...Array.from(dateMap.values()));
    }
    
    return data;
  }, [filterType, policies]);

  const filteredList = useMemo(() => {
    if (!searchText.trim()) return masterDataList;
    return masterDataList.filter((item) =>
      item.col1.toLowerCase().includes(searchText.toLowerCase()) ||
      item.col2.toLowerCase().includes(searchText.toLowerCase())
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

  const toggleItem = (item: { id: string; col1: string; col2: string }) => {
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

  const handleApply = () => {
    onApplyFilters({
      filterType,
      selectedIds: selectedItems.map(s => s.id),
      selectedItems: selectedItems,
    });
    onClose();
  };

  // Reset selected items when changing filter type
  const handleFilterTypeChange = (newType: "Policies" | "Agent Bill Wise" | "Interest Date Wise") => {
    setFilterType(newType);
    setSelectedItems([]);
    setCurrentPage(1);
    setSearchText("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B1220]/75 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#0A5699] via-[#2B7DB3] to-transparent" />

        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white text-slate-800">
          <div>
            <h2 className="text-lg font-medium text-[#0A5699]">
              Filter Options
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-3 border-b border-slate-200 bg-[#F4F7FB]">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <span className="text-sm font-medium text-slate-600">
              Filter Options :
            </span>
            <div className="relative">
              <select
                value={filterType}
                onChange={(e) => handleFilterTypeChange(e.target.value as any)}
                className="appearance-none bg-white border border-slate-300 rounded-md px-4 py-1.5 pr-8 text-sm font-medium text-slate-800 focus:outline-none focus:border-[#0A5699]"
              >
                <option value="Policies">Policies</option>
                <option value="Agent Bill Wise">Agent Bill Wise</option>
                <option value="Interest Date Wise">Interest Date Wise</option>
              </select>
              <ChevronDown
                size={14}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </div>
          </div>

          <div className="relative w-full sm:w-72">
            <input
              type="text"
              placeholder="Search by Text"
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-white border border-slate-300 rounded-md py-1.5 pl-3 pr-8 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0A5699]"
            />
            <Search size={15} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-hidden min-h-[350px]">
          <div className="md:col-span-8 border-r border-slate-200 flex flex-col justify-between p-4 bg-white">
            <div className="overflow-y-auto border border-slate-200 rounded-md shadow-sm h-[320px]">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="sticky top-0 bg-[#F4F7FB] border-b border-slate-200 z-10">
                  <tr>
                    <th className="w-12 px-4 py-2 font-medium">
                      <input
                        type="checkbox"
                        checked={isAllSelectedOnPage}
                        onChange={toggleSelectAllOnPage}
                        className="w-4 h-4 text-[#0A5699] rounded border-slate-300 focus:ring-[#0A5699] cursor-pointer"
                      />
                    </th>
                    <th className="px-4 py-2 font-medium tracking-wider">{modalConfig.col1}</th>
                    <th className="px-4 py-2 font-medium tracking-wider">{modalConfig.col2}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedList.map((item) => {
                    const isChecked = selectedItems.some((s) => s.id === item.id);
                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50 transition cursor-pointer"
                        onClick={() => toggleItem(item)}
                      >
                        <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleItem(item)}
                            className="w-4 h-4 text-[#0A5699] rounded border-slate-300 focus:ring-[#0A5699] cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-2">{item.col1}</td>
                        <td className="px-4 py-2">{item.col2}</td>
                      </tr>
                    );
                  })}
                  {paginatedList.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-sm text-slate-400">
                        No records found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-4 text-xs text-slate-600 mt-2">
              <span className="px-3 py-1 font-medium text-slate-600">
                {filteredList.length > 0
                  ? `${(currentPage - 1) * pageSize + 1} - ${Math.min(
                      currentPage * pageSize,
                      filteredList.length
                    )} of ${filteredList.length}`
                  : "0 items"}
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(1)}
                  className="px-2 py-1 border border-slate-200 rounded-md disabled:opacity-30 hover:bg-slate-50 font-medium"
                >
                  |&lt;
                </button>
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className="px-3 py-1 border border-slate-200 rounded-md disabled:opacity-30 hover:bg-slate-50 font-medium"
                >
                  Prev
                </button>
                <span className="px-3 py-1 bg-[#F4F7FB] text-[#0A5699] border border-slate-200 rounded-md font-medium">
                  {currentPage}
                </span>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="px-3 py-1 border border-slate-200 rounded-md disabled:opacity-30 hover:bg-slate-50 font-medium"
                >
                  Next
                </button>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  className="px-2 py-1 border border-slate-200 rounded-md disabled:opacity-30 hover:bg-slate-50 font-medium"
                >
                  &gt;|
                </button>
              </div>
            </div>
          </div>

          <div className="md:col-span-4 p-4 flex flex-col justify-between bg-slate-50/60 relative">
            <div className="border border-slate-200 rounded-md overflow-hidden bg-white h-full flex flex-col shadow-sm">
              <div className="bg-[#F4F7FB] px-4 py-2 border-b border-slate-200 text-sm font-medium text-slate-700">
                Selected Filter
              </div>
              <div className="p-3 flex-1 overflow-y-auto space-y-2">
                {selectedItems.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center pt-8">
                    No items selected
                  </p>
                ) : (
                  selectedItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between border border-slate-200 rounded-md p-2 bg-white text-xs hover:border-[#0A5699]/30 transition"
                    >
                      <div className="flex flex-col truncate pr-2">
                        <span className="font-medium text-slate-800">{item.col1}</span>
                        <span className="text-slate-500 text-[10px] truncate">{item.col2}</span>
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-slate-400 hover:text-red-600 transition p-1 shrink-0"
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

        <div className="flex items-center justify-end px-6 py-4 border-t border-slate-200 bg-white">
          <button
            onClick={handleApply}
            className="px-6 py-2 bg-gradient-to-r from-slate-100 to-slate-200 text-slate-700 font-medium text-sm rounded-md shadow-sm hover:brightness-95 transition border border-slate-300"
          >
            Apply Filter
          </button>
        </div>
      </div>
    </div>
  );
}