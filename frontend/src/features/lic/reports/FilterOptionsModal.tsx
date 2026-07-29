"use client";

import { useState, useMemo } from "react";
import { X, Search, ChevronDown, Trash2 } from "lucide-react";

export interface SelectedFilterItem {
  type: string;
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

export const SYSTEM_POLICY_STATUSES = [
  { id: "status-inforce", name: "Inforce", defaultChecked: true },
  { id: "status-paidup", name: "Fully paid-up", defaultChecked: true },
  { id: "status-lapsed", name: "Lapsed", defaultChecked: true },
  { id: "status-red-paidup", name: "Reduced Paid-up", defaultChecked: true },
  { id: "status-death", name: "Death Claim", defaultChecked: false },
  { id: "status-maturity", name: "Maturity Claim", defaultChecked: false },
  { id: "status-record", name: "Record", defaultChecked: false },
  { id: "status-surrender", name: "Surrender / Discounted", defaultChecked: false },
];

export default function FilterOptionsModal({
  isOpen,
  onClose,
  agencies = [],
  policyStatuses = [],
  selectedFilters: initialSelectedFilters = [],
  onApplyFilters,
}: FilterOptionsModalProps) {
  const [filterCategory, setFilterCategory] = useState<string>("Agencies");
  const [searchText, setSearchText] = useState("");

  // Initialize selected items state: default 4 Policy Statuses checked if none provided
  const [selectedItems, setSelectedItems] = useState<SelectedFilterItem[]>(() => {
    if (initialSelectedFilters && initialSelectedFilters.length > 0) {
      return initialSelectedFilters;
    }
    return SYSTEM_POLICY_STATUSES.filter((s) => s.defaultChecked).map((s) => ({
      type: "Policy Status",
      id: s.id,
      name: s.name,
    }));
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [viewingCategory, setViewingCategory] = useState<string | null>(null);
  const pageSize = 8;

  // Dynamic Agencies WITHOUT code numbers like AG001, AG002
  const dynamicAgencies = useMemo(() => {
    return agencies.map((a) => ({
      id: a.id,
      name: a.agencyName || a.agencyCode || "Agency",
    }));
  }, [agencies]);

  // Policy Statuses: Use standard list so all 8 are always present, with 4 ticked by default
  const dynamicStatuses = useMemo(() => {
    const list = [...SYSTEM_POLICY_STATUSES];
    policyStatuses.forEach((ps) => {
      if (ps.statusName && !list.some((l) => l.name.toLowerCase() === ps.statusName.toLowerCase())) {
        list.push({ id: ps.id, name: ps.statusName, defaultChecked: false });
      }
    });
    return list.map((s) => ({ id: s.id, name: s.name }));
  }, [policyStatuses]);

  const paymentModesList = useMemo(
    () => [
      { id: "mode-y", name: "Yearly (Y)" },
      { id: "mode-h", name: "Half-Yearly (H)" },
      { id: "mode-q", name: "Quarterly (Q)" },
      { id: "mode-m", name: "Monthly (M)" },
      { id: "mode-s", name: "Single Premium (S)" },
      { id: "mode-nach", name: "NACH Mode" },
      { id: "mode-sss", name: "SSS Mode" },
    ],
    []
  );

  const crmGroupsList = useMemo(
    () => [
      { id: "crm-vip", name: "VIP Clients" },
      { id: "crm-corporate", name: "Corporate Group" },
      { id: "crm-family", name: "Family Group" },
      { id: "crm-individual", name: "Individual Client" },
    ],
    []
  );

  const groupRatingList = useMemo(
    () => [
      { id: "rating-a", name: "Grade A" },
      { id: "rating-b", name: "Grade B" },
      { id: "rating-c", name: "Grade C" },
    ],
    []
  );

  const groupCategoryList = useMemo(
    () => [
      { id: "cat-client", name: "Client" },
      { id: "cat-personal", name: "Personal" },
      { id: "cat-others", name: "Others" },
    ],
    []
  );

  const activeCategoryList = useMemo(() => {
    switch (filterCategory) {
      case "Agencies":
        return dynamicAgencies;
      case "Policy Status":
        return dynamicStatuses;
      case "Payment Modes":
        return paymentModesList;
      case "CRM Groups":
        return crmGroupsList;
      case "Group Rating":
        return groupRatingList;
      case "Group Category":
        return groupCategoryList;
      default:
        return dynamicAgencies;
    }
  }, [
    filterCategory,
    dynamicAgencies,
    dynamicStatuses,
    paymentModesList,
    crmGroupsList,
    groupRatingList,
    groupCategoryList,
  ]);

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

  // Checkbox sync: Is every item on current page checked?
  const isCategoryAllSelected =
    paginatedList.length > 0 &&
    paginatedList.every((item) =>
      selectedItems.some(
        (s) =>
          s.type === filterCategory &&
          (s.id === item.id || s.name.toLowerCase() === item.name.toLowerCase())
      )
    );

  const groupedSelected = useMemo(() => {
    const groups: { [key: string]: SelectedFilterItem[] } = {};
    selectedItems.forEach((item) => {
      if (!groups[item.type]) groups[item.type] = [];
      groups[item.type].push(item);
    });
    return groups;
  }, [selectedItems]);

  if (!isOpen) return null;

  const toggleSelectAllCategory = () => {
    if (isCategoryAllSelected) {
      // Untick all paginated items
      setSelectedItems((prev) =>
        prev.filter(
          (s) =>
            !(
              s.type === filterCategory &&
              paginatedList.some((p) => p.id === s.id || p.name.toLowerCase() === s.name.toLowerCase())
            )
        )
      );
    } else {
      // Tick all paginated items
      const newAdditions: SelectedFilterItem[] = paginatedList
        .filter(
          (item) =>
            !selectedItems.some(
              (s) => s.type === filterCategory && (s.id === item.id || s.name.toLowerCase() === item.name.toLowerCase())
            )
        )
        .map((item) => ({ type: filterCategory, id: item.id, name: item.name }));
      setSelectedItems((prev) => [...prev, ...newAdditions]);
    }
  };

  const toggleItem = (id: string, name: string) => {
    const normName = name.toLowerCase();
    const exists = selectedItems.some(
      (s) => s.type === filterCategory && (s.id === id || s.name.toLowerCase() === normName)
    );

    if (exists) {
      // Untick -> remove item immediately from selected state
      setSelectedItems((prev) =>
        prev.filter(
          (s) => !(s.type === filterCategory && (s.id === id || s.name.toLowerCase() === normName))
        )
      );
    } else {
      // Tick -> add item to selected state
      setSelectedItems((prev) => [...prev, { type: filterCategory, id, name }]);
    }
  };

  const removeFilterGroup = (type: string) => {
    setSelectedItems((prev) => prev.filter((s) => s.type !== type));
  };

  const removeItem = (type: string, id: string) => {
    setSelectedItems((prev) => prev.filter((s) => !(s.type === type && s.id === id)));
  };

  const handleApply = () => {
    onApplyFilters(selectedItems);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B1220]/75 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Website Gold Line */}
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#E8C77A] to-transparent" />

        {/* Header */}
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
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <span className="font-serif text-xs font-bold text-slate-700 uppercase tracking-wider">
              Filter Options :
            </span>
            <div className="relative">
              <select
                value={filterCategory}
                onChange={(e) => {
                  setFilterCategory(e.target.value);
                  setCurrentPage(1);
                }}
                className="appearance-none bg-white border border-slate-300 rounded-lg px-4 py-1.5 pr-8 text-xs font-bold text-slate-800 hover:border-[#B8873A] focus:outline-none focus:ring-2 focus:ring-[#B8873A]/20"
              >
                <option value="Agencies">Agencies</option>
                <option value="Payment Modes">Payment Modes</option>
                <option value="CRM Groups">CRM Groups</option>
                <option value="Policy Status">Policy Status</option>
                <option value="Group Rating">Group Rating</option>
                <option value="Group Category">Group Category</option>
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
              className="w-full bg-white border border-slate-300 rounded-lg py-1.5 pl-3 pr-8 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#B8873A]"
            />
            <Search size={15} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        {/* Body Split */}
        <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-hidden min-h-[350px]">
          {/* Left Panel: Checklist */}
          <div className="md:col-span-7 border-r border-slate-200 flex flex-col justify-between p-4 bg-white">
            <div className="overflow-y-auto">
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                {/* Header Row */}
                <label className="flex items-center gap-3 px-4 py-3 bg-slate-100/90 border-b border-slate-200 font-serif text-xs font-bold text-slate-800 uppercase tracking-wider cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isCategoryAllSelected}
                    onChange={toggleSelectAllCategory}
                    className="w-4 h-4 rounded border-slate-300 text-[#B8873A] focus:ring-[#B8873A]"
                  />
                  <span>{filterCategory}</span>
                </label>

                {/* Items */}
                <div className="divide-y divide-slate-100">
                  {paginatedList.map((item) => {
                    const isChecked = selectedItems.some(
                      (s) =>
                        s.type === filterCategory &&
                        (s.id === item.id || s.name.toLowerCase() === item.name.toLowerCase())
                    );
                    return (
                      <label
                        key={item.id}
                        className="flex items-center gap-3 px-4 py-2.5 text-xs font-medium text-slate-800 hover:bg-[#B8873A]/5 cursor-pointer transition"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleItem(item.id, item.name)}
                          className="w-4 h-4 rounded border-slate-300 text-[#B8873A] focus:ring-[#B8873A]"
                        />
                        <span>{item.name}</span>
                      </label>
                    );
                  })}

                  {paginatedList.length === 0 && (
                    <div className="px-4 py-8 text-center text-xs text-slate-400">
                      No records found
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Left Footer Pagination */}
            <div className="flex items-center justify-between pt-4 text-xs text-slate-600 border-t border-slate-100 mt-2">
              <span className="bg-[#B8873A]/10 text-[#B8873A] px-3 py-1 rounded-md font-bold text-[11px]">
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
                <span className="px-3 py-1 bg-[#0B1220] text-white rounded-md font-bold text-[11px]">
                  {currentPage}
                </span>
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

          {/* Right Panel: Selected Filter */}
          <div className="md:col-span-5 p-4 flex flex-col justify-between bg-slate-50/60 relative">
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white h-full flex flex-col shadow-xs">
              <div className="bg-[#0B1220] px-4 py-2.5 border-b border-slate-200 font-serif text-xs font-bold text-[#E8C77A] uppercase tracking-wider">
                Selected Filter
              </div>
              <div className="p-3 flex-1 overflow-y-auto space-y-2">
                {Object.keys(groupedSelected).length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center pt-8">
                    No filters selected. Check items on the left.
                  </p>
                ) : (
                  Object.entries(groupedSelected).map(([type, items]) => (
                    <div
                      key={type}
                      className="flex items-center justify-between border border-slate-200 rounded-lg p-2.5 bg-white text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">{type}</span>
                        <span className="bg-[#B8873A]/10 text-[#B8873A] px-2 py-0.5 rounded-full font-extrabold text-[11px]">
                          {items.length}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setViewingCategory(type)}
                          className="text-[#B8873A] border border-[#B8873A]/30 px-2 py-0.5 rounded text-[11px] font-bold bg-[#B8873A]/10 hover:bg-[#B8873A]/20 transition"
                        >
                          View
                        </button>
                        <button
                          onClick={() => removeFilterGroup(type)}
                          className="text-slate-400 hover:text-red-600 transition p-1"
                          title="Clear group"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* View Popover Sub-Overlay */}
            {viewingCategory && groupedSelected[viewingCategory] && (
              <div className="absolute inset-4 bg-white rounded-xl border border-slate-300 shadow-2xl flex flex-col z-20 animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
                <div className="bg-[#0B1220] px-4 py-2.5 border-b border-slate-200 flex items-center justify-between font-serif text-xs font-bold text-[#E8C77A] uppercase tracking-wider">
                  <span>{viewingCategory}</span>
                  <button
                    onClick={() => setViewingCategory(null)}
                    className="text-slate-300 hover:text-white"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="p-3 flex-1 overflow-y-auto divide-y divide-slate-100">
                  {groupedSelected[viewingCategory].map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between py-2 px-1 text-xs text-slate-800 font-medium"
                    >
                      <span>{item.name}</span>
                      <button
                        onClick={() => removeItem(viewingCategory, item.id)}
                        className="text-slate-400 hover:text-red-600 p-1 transition"
                        title="Remove status"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
