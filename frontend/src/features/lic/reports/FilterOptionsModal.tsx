"use client";

import { useState, useMemo } from "react";
import { X, Search, ChevronDown, Trash2, Filter } from "lucide-react";

export interface SelectedFilterItem {
  type: string; // e.g. 'Agencies', 'Policy Status', 'Plan'
  id: string;
  name: string;
}

interface FilterOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  agencies: Array<{ id: string; agencyName: string; agencyCode: string }>;
  policyStatuses: Array<{ id: string; statusName: string; statusCode: string }>;
  selectedFilters: SelectedFilterItem[];
  onApplyFilters: (filters: SelectedFilterItem[]) => void;
}

export default function FilterOptionsModal({
  isOpen,
  onClose,
  agencies = [],
  policyStatuses = [],
  selectedFilters: initialSelectedFilters = [],
  onApplyFilters,
}: FilterOptionsModalProps) {
  const [filterCategory, setFilterCategory] = useState<"Agencies" | "Policy Status">("Agencies");
  const [searchText, setSearchText] = useState("");
  const [selectedItems, setSelectedItems] = useState<SelectedFilterItem[]>(initialSelectedFilters);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Combine dynamic agencies & statuses with standard defaults if DB has few records
  const dynamicAgencies = useMemo(() => {
    const list = agencies.map((a) => ({ id: a.id, name: a.agencyName || a.agencyCode }));
    const defaultAgencies = [
      { id: "agency-other", name: "Other Agencies" },
      { id: "agency-jm", name: "Jayant Mahabole" },
      { id: "agency-mm", name: "Manish Y. Mahabole" },
    ];
    const combined = [...list];
    defaultAgencies.forEach((d) => {
      if (!combined.some((item) => item.name.toLowerCase() === d.name.toLowerCase())) {
        combined.push(d);
      }
    });
    return combined;
  }, [agencies]);

  const dynamicStatuses = useMemo(() => {
    const list = policyStatuses.map((s) => ({ id: s.id, name: s.statusName || s.statusCode }));
    const defaultStatuses = [
      { id: "status-inforce", name: "Inforce" },
      { id: "status-paidup", name: "Reduced Paidup" },
      { id: "status-lapsed", name: "Lapsed" },
      { id: "status-matured", name: "Matured" },
    ];
    const combined = [...list];
    defaultStatuses.forEach((d) => {
      if (!combined.some((item) => item.name.toLowerCase() === d.name.toLowerCase())) {
        combined.push(d);
      }
    });
    return combined;
  }, [policyStatuses]);

  const activeCategoryList = filterCategory === "Agencies" ? dynamicAgencies : dynamicStatuses;

  const filteredList = useMemo(() => {
    if (!searchText.trim()) return activeCategoryList;
    return activeCategoryList.filter((item) =>
      item.name.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [activeCategoryList, searchText]);

  const totalPages = Math.ceil(filteredList.length / pageSize) || 1;

  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, currentPage]);

  const isCategoryAllSelected =
    paginatedList.length > 0 &&
    paginatedList.every((item) =>
      selectedItems.some((s) => s.type === filterCategory && s.id === item.id)
    );

  const groupedSelected = useMemo(() => {
    const groups: { [key: string]: SelectedFilterItem[] } = {};
    selectedItems.forEach((item) => {
      if (!groups[item.type]) groups[item.type] = [];
      groups[item.type].push(item);
    });
    return groups;
  }, [selectedItems]);

  // All Hooks have been defined above unconditionally.
  if (!isOpen) return null;

  const toggleSelectAllCategory = () => {
    if (isCategoryAllSelected) {
      setSelectedItems((prev) =>
        prev.filter(
          (s) => !(s.type === filterCategory && paginatedList.some((p) => p.id === s.id))
        )
      );
    } else {
      const newAdditions: SelectedFilterItem[] = paginatedList
        .filter((item) => !selectedItems.some((s) => s.type === filterCategory && s.id === item.id))
        .map((item) => ({ type: filterCategory, id: item.id, name: item.name }));
      setSelectedItems((prev) => [...prev, ...newAdditions]);
    }
  };

  const toggleItem = (id: string, name: string) => {
    const exists = selectedItems.some((s) => s.type === filterCategory && s.id === id);
    if (exists) {
      setSelectedItems((prev) => prev.filter((s) => !(s.type === filterCategory && s.id === id)));
    } else {
      setSelectedItems((prev) => [...prev, { type: filterCategory, id, name }]);
    }
  };

  const removeFilterGroup = (type: string) => {
    setSelectedItems((prev) => prev.filter((s) => s.type !== type));
  };

  const handleApply = () => {
    onApplyFilters(selectedItems);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-4xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
          <h2 className="text-xl font-semibold text-blue-700">Filter Options</h2>
          <button
            onClick={onClose}
            className="p-1 text-blue-700 hover:text-blue-900 hover:bg-slate-100 rounded-lg transition"
            title="Close"
          >
            <X size={24} />
          </button>
        </div>

        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-3 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-sm text-slate-600 font-medium whitespace-nowrap">Filter Options :</span>
            <div className="relative">
              <select
                value={filterCategory}
                onChange={(e) => {
                  setFilterCategory(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="appearance-none bg-white border border-slate-300 rounded-md px-4 py-1.5 pr-8 text-sm font-semibold text-slate-700 hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="Agencies">Agencies</option>
                <option value="Policy Status">Policy Status</option>
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
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
              className="w-full bg-white border-b border-slate-300 py-1.5 pl-3 pr-8 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-600"
            />
            <Search size={16} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        {/* Body Split */}
        <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-hidden min-h-[350px]">
          {/* Left Panel: Checklist */}
          <div className="md:col-span-7 border-r border-slate-200 flex flex-col justify-between p-4">
            <div className="overflow-y-auto">
              <div className="border border-slate-200 rounded-md overflow-hidden bg-white">
                {/* Header Row */}
                <label className="flex items-center gap-3 px-4 py-3 bg-blue-50/60 border-b border-slate-200 font-semibold text-sm text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isCategoryAllSelected}
                    onChange={toggleSelectAllCategory}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>{filterCategory}</span>
                </label>

                {/* Items */}
                <div className="divide-y divide-slate-100">
                  {paginatedList.map((item) => {
                    const isChecked = selectedItems.some(
                      (s) => s.type === filterCategory && s.id === item.id
                    );
                    return (
                      <label
                        key={item.id}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer transition"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleItem(item.id, item.name)}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span>{item.name}</span>
                      </label>
                    );
                  })}
                  {paginatedList.length === 0 && (
                    <p className="px-4 py-6 text-center text-sm text-slate-400">No items found</p>
                  )}
                </div>
              </div>
            </div>

            {/* Left Footer Pagination */}
            <div className="flex items-center justify-between pt-4 text-sm text-slate-600 border-t border-slate-100 mt-2">
              <span className="bg-blue-50 px-3 py-1 rounded text-xs font-medium text-slate-700">
                {filteredList.length > 0
                  ? `${(currentPage - 1) * pageSize + 1} - ${Math.min(
                      currentPage * pageSize,
                      filteredList.length
                    )} of ${filteredList.length}`
                  : "0 items"}
              </span>

              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(1)}
                  className="px-2 py-1 border border-slate-200 rounded disabled:opacity-30 hover:bg-slate-50 text-xs"
                >
                  |&lt;
                </button>
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className="px-3 py-1 border border-slate-200 rounded disabled:opacity-30 hover:bg-slate-50 text-xs"
                >
                  Prev
                </button>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold">
                  {currentPage}
                </span>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="px-3 py-1 border border-slate-200 rounded disabled:opacity-30 hover:bg-slate-50 text-xs"
                >
                  Next
                </button>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  className="px-2 py-1 border border-slate-200 rounded disabled:opacity-30 hover:bg-slate-50 text-xs"
                >
                  &gt;|
                </button>
              </div>
            </div>
          </div>

          {/* Right Panel: Selected Filter */}
          <div className="md:col-span-5 p-4 flex flex-col justify-between bg-slate-50/40">
            <div className="border border-slate-200 rounded-md overflow-hidden bg-white h-full flex flex-col">
              <div className="bg-blue-50/60 px-4 py-2.5 border-b border-slate-200 font-semibold text-sm text-slate-800">
                Selected Filter
              </div>
              <div className="p-3 flex-1 overflow-y-auto space-y-2">
                {Object.keys(groupedSelected).length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center pt-8">
                    No filters selected yet. Check items on the left to add filters.
                  </p>
                ) : (
                  Object.entries(groupedSelected).map(([type, items]) => (
                    <div
                      key={type}
                      className="flex items-center justify-between border border-slate-200 rounded-lg p-2.5 bg-white text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-700">{type}</span>
                        <span className="bg-slate-100 px-2 py-0.5 rounded-full text-slate-600 font-bold">
                          {items.length}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className="text-blue-600 border border-blue-200 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50"
                          title={items.map((i) => i.name).join(", ")}
                        >
                          View
                        </span>
                        <button
                          onClick={() => removeFilterGroup(type)}
                          className="text-slate-400 hover:text-red-600 transition p-1"
                          title="Clear category filter"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
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
            className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium text-sm rounded-md shadow-md shadow-blue-500/20 hover:from-blue-700 hover:to-blue-800 transition"
          >
            Apply Filter
          </button>
        </div>
      </div>
    </div>
  );
}
