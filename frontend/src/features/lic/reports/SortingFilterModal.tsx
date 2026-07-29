"use client";

import { useState, useMemo } from "react";
import { X, Search, Trash2, Database } from "lucide-react";

export interface SortingFilterSelection {
  sortingOption: string;
  selectedIds: string[];
  selectedItems: Array<{ id: string; code?: string; name: string; extra?: string }>;
}

interface SortingFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  sortingOption: string;
  customers: Array<{
    id: string;
    groupCode?: string | null;
    name: string;
    groupName?: string | null;
    resArea?: string | null;
    resCity?: string | null;
  }>;
  policies: Array<any>;
  selectedFilters: SortingFilterSelection | null;
  onApplySortingFilter: (selection: SortingFilterSelection) => void;
}

export default function SortingFilterModal({
  isOpen,
  onClose,
  sortingOption,
  customers = [],
  policies = [],
  selectedFilters: initialSelection,
  onApplySortingFilter,
}: SortingFilterModalProps) {
  const [searchText, setSearchText] = useState("");
  const [selectedItems, setSelectedItems] = useState<
    Array<{ id: string; code?: string; name: string; extra?: string }>
  >(initialSelection?.selectedItems || []);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 9;

  // Title and Column Configuration based on selected sortingOption
  const modalConfig = useMemo(() => {
    switch (sortingOption) {
      case "groupMemberwise":
        return {
          title: "Sorting Filter : Members Wise",
          col1: "Group Code",
          col2: "Group Member",
          col3: "Group Head Name",
        };
      case "areaWise":
        return {
          title: "Sorting Filter : Areas Wise",
          col1: "Area Name",
          col2: "",
          col3: "",
        };
      case "subAreaWise":
        return {
          title: "Sorting Filter : Sub-Areas Wise",
          col1: "Sub-Area Name",
          col2: "",
          col3: "",
        };
      case "branchNoWise":
        return {
          title: "Sorting Filter : Branch Wise",
          col1: "Branch No.",
          col2: "Branch Name",
          col3: "",
        };
      case "policyNoWise":
        return {
          title: "Sorting Filter : Policy Wise",
          col1: "Policy No.",
          col2: "Client Name",
          col3: "",
        };
      case "planWise":
        return {
          title: "Sorting Filter : Plan Wise",
          col1: "Plan No.",
          col2: "Plan Name",
          col3: "",
        };
      case "commencementDatewise":
        return {
          title: "Sorting Filter : Commencement Datewise",
          col1: "Commencement Date",
          col2: "",
          col3: "",
        };
      case "completionDatewise":
        return {
          title: "Sorting Filter : Completion Datewise",
          col1: "Completion Date",
          col2: "",
          col3: "",
        };
      case "groupsWise":
      default:
        return {
          title: "Sorting Filter : Groups Wise",
          col1: "Group Code",
          col2: "Group Head Name",
          col3: "",
        };
    }
  }, [sortingOption]);

  // 100% Dynamic Data list derived STRICTLY from database props! No hardcoded screenshot mock names!
  const masterDataList: Array<{ id: string; code?: string; name: string; extra?: string }> =
    useMemo(() => {
      if (sortingOption === "groupMemberwise") {
        // Members Wise: Dynamic from customers in DB
        return customers.map((c, idx) => ({
          id: c.id,
          code: c.groupCode || `0000${(idx + 1).toString().padStart(2, "0")}`,
          name: c.name,
          extra: c.groupName || c.name,
        }));
      }

      if (sortingOption === "areaWise") {
        // Area Wise: Dynamic areas from DB customers
        const areas = Array.from(
          new Set(
            customers
              .map((c) => c.resArea || c.resCity)
              .filter((area): area is string => Boolean(area && area.trim().length > 0))
          )
        );
        return areas.map((area, idx) => ({
          id: `area-${idx}`,
          code: area,
          name: area,
          extra: "",
        }));
      }

      if (sortingOption === "subAreaWise") {
        const subAreas = Array.from(
          new Set(
            customers
              .map((c) => (c as any).resCity)
              .filter((city): city is string => Boolean(city && city.trim().length > 0))
          )
        );
        return subAreas.map((sub, idx) => ({
          id: `sub-${idx}`,
          code: sub,
          name: sub,
          extra: "",
        }));
      }

      if (sortingOption === "branchNoWise") {
        // Branch Wise: Dynamic branches from policies in DB
        const branchesMap: { [code: string]: string } = {};
        policies.forEach((p) => {
          if (p.branch?.branchCode) {
            branchesMap[p.branch.branchCode] = p.branch.branchName || `Branch ${p.branch.branchCode}`;
          }
        });
        const list = Object.entries(branchesMap).map(([code, name]) => ({
          id: `br-${code}`,
          code,
          name,
          extra: "",
        }));
        return list;
      }

      if (sortingOption === "planWise") {
        // Plan Wise: Dynamic product plans from policies in DB
        const plansMap: { [planNo: string]: string } = {};
        policies.forEach((p) => {
          if (p.product?.planNumber) {
            plansMap[p.product.planNumber] = p.product.productName || `Plan ${p.product.planNumber}`;
          }
        });
        return Object.entries(plansMap).map(([planNo, productName]) => ({
          id: `plan-${planNo}`,
          code: planNo,
          name: productName,
          extra: "",
        }));
      }

      if (sortingOption === "policyNoWise") {
        // Policy Wise: Dynamic policies from DB
        return policies.map((p) => ({
          id: p.id || p.policyNumber,
          code: p.policyNumber || "N/A",
          name: p.customer?.name || "Client",
          extra: "",
        }));
      }

      // Default Groups Wise: Dynamic Groups from DB customers
      return customers.map((c, idx) => ({
        id: c.id,
        code: c.groupCode || `0000${(idx + 1).toString().padStart(2, "0")}`,
        name: c.groupName || c.name,
        extra: "",
      }));
    }, [sortingOption, customers, policies]);

  const filteredList = useMemo(() => {
    if (!searchText.trim()) return masterDataList;
    const query = searchText.toLowerCase();
    return masterDataList.filter(
      (item) =>
        (item.code && item.code.toLowerCase().includes(query)) ||
        item.name.toLowerCase().includes(query) ||
        (item.extra && item.extra.toLowerCase().includes(query))
    );
  }, [masterDataList, searchText]);

  const totalItems = filteredList.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, currentPage]);

  const isAllPaginatedSelected =
    paginatedList.length > 0 &&
    paginatedList.every((item) => selectedItems.some((s) => s.id === item.id));

  if (!isOpen) return null;

  const toggleSelectAll = () => {
    if (isAllPaginatedSelected) {
      setSelectedItems((prev) =>
        prev.filter((s) => !paginatedList.some((p) => p.id === s.id))
      );
    } else {
      const additions = paginatedList.filter(
        (p) => !selectedItems.some((s) => s.id === p.id)
      );
      setSelectedItems((prev) => [...prev, ...additions]);
    }
  };

  const toggleItem = (item: { id: string; code?: string; name: string; extra?: string }) => {
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
    onApplySortingFilter({
      sortingOption,
      selectedIds: selectedItems.map((s) => s.code || s.id),
      selectedItems,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B1220]/75 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Top Website Theme Gold Line */}
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#E8C77A] to-transparent" />

        {/* Header (Website Navy `#0B1220` with Gold `#E8C77A`) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0B1220] text-white">
          <div>
            <h2 className="font-serif text-lg font-bold tracking-wider text-[#E8C77A] uppercase">
              Filter Options
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-3 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <span className="font-serif text-xs font-bold text-slate-800 uppercase tracking-wider">
              {modalConfig.title}
            </span>
          </div>

          <div className="relative w-full sm:w-80">
            <input
              type="text"
              placeholder="Search by Text"
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-white border border-slate-300 rounded-lg py-1.5 pl-3 pr-8 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#B8873A]"
            />
            <Search size={15} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        {/* Body Split */}
        <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-hidden min-h-[380px]">
          {/* Left Table */}
          <div className="md:col-span-7 border-r border-slate-200 flex flex-col justify-between p-4 bg-white">
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100/90 border-b border-slate-200 font-serif text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                    <th className="py-3 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={isAllPaginatedSelected}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-slate-300 text-[#B8873A] focus:ring-[#B8873A]"
                      />
                    </th>
                    <th className="py-3 px-3">{modalConfig.col1}</th>
                    {modalConfig.col2 && <th className="py-3 px-3">{modalConfig.col2}</th>}
                    {modalConfig.col3 && <th className="py-3 px-3">{modalConfig.col3}</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedList.map((item) => {
                    const isChecked = selectedItems.some((s) => s.id === item.id);
                    return (
                      <tr
                        key={item.id}
                        onClick={() => toggleItem(item)}
                        className="hover:bg-[#B8873A]/5 cursor-pointer transition"
                      >
                        <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleItem(item)}
                            className="w-4 h-4 rounded border-slate-300 text-[#B8873A] focus:ring-[#B8873A]"
                          />
                        </td>
                        <td className="py-2.5 px-3 font-mono font-semibold text-slate-700">
                          {item.code || item.name}
                        </td>
                        {modalConfig.col2 && (
                          <td className="py-2.5 px-3 font-semibold text-slate-900 uppercase">
                            {item.name}
                          </td>
                        )}
                        {modalConfig.col3 && (
                          <td className="py-2.5 px-3 text-slate-600 font-medium">{item.extra}</td>
                        )}
                      </tr>
                    );
                  })}

                  {paginatedList.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-400">
                        <div className="space-y-2">
                          <Database size={28} className="mx-auto text-slate-300" />
                          <p className="text-xs font-semibold text-slate-500">
                            No records found for {modalConfig.col1} in database
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Bar */}
            <div className="flex items-center justify-between pt-3 text-xs text-slate-600 border-t border-slate-100 mt-2">
              <span className="bg-[#B8873A]/10 text-[#B8873A] px-3 py-1 rounded-md font-bold text-[11px]">
                {totalItems > 0
                  ? `${(currentPage - 1) * pageSize + 1} - ${Math.min(
                      currentPage * pageSize,
                      totalItems
                    )} of ${totalItems}`
                  : "0 items"}
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(1)}
                  className="px-2 py-1 border border-slate-200 rounded-md disabled:opacity-30 hover:bg-slate-50 text-[11px] font-medium"
                >
                  |&lt;
                </button>
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className="px-2.5 py-1 border border-slate-200 rounded-md disabled:opacity-30 hover:bg-slate-50 text-[11px] font-medium"
                >
                  Prev
                </button>

                {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                  const pNum = i + 1;
                  return (
                    <button
                      key={pNum}
                      onClick={() => setCurrentPage(pNum)}
                      className={`px-3 py-1 rounded-md text-[11px] font-bold ${
                        currentPage === pNum
                          ? "bg-[#0B1220] text-white"
                          : "border border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {pNum}
                    </button>
                  );
                })}

                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="px-2.5 py-1 border border-slate-200 rounded-md disabled:opacity-30 hover:bg-slate-50 text-[11px] font-medium"
                >
                  Next
                </button>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  className="px-2 py-1 border border-slate-200 rounded-md disabled:opacity-30 hover:bg-slate-50 text-[11px] font-medium"
                >
                  &gt;|
                </button>
              </div>
            </div>
          </div>

          {/* Right Selected Filter Panel */}
          <div className="md:col-span-5 p-4 flex flex-col justify-between bg-slate-50/60">
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white h-full flex flex-col shadow-xs">
              <div className="bg-[#0B1220] px-4 py-2.5 border-b border-slate-200 font-serif text-xs font-bold text-[#E8C77A] uppercase tracking-wider flex items-center justify-between">
                <span>Selected Filter</span>
                <span className="text-[11px] bg-[#B8873A]/20 text-[#E8C77A] px-2 py-0.5 rounded-full font-bold">
                  {selectedItems.length} Selected
                </span>
              </div>

              <div className="p-3 flex-1 overflow-y-auto space-y-2">
                {selectedItems.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center pt-8">
                    All items selected by default. Check specific items on the left to filter.
                  </p>
                ) : (
                  selectedItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between border border-slate-200 rounded-lg p-2 bg-white text-xs hover:border-[#B8873A] transition"
                    >
                      <div>
                        {item.code && (
                          <span className="font-mono font-bold text-[#B8873A] mr-2">{item.code}</span>
                        )}
                        <span className="font-semibold text-slate-800">{item.name}</span>
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-slate-400 hover:text-red-600 transition p-1"
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
        <div className="flex items-center justify-end px-6 py-3 border-t border-slate-200 bg-white">
          <button
            onClick={handleApply}
            className="px-6 py-2 bg-gradient-to-r from-[#B8873A] to-[#D9AE63] text-[#0B1220] font-bold text-xs uppercase tracking-wider rounded-lg shadow-md hover:brightness-105 transition"
          >
            Apply Filter
          </button>
        </div>
      </div>
    </div>
  );
}
