"use client";

import { useState, useMemo, useEffect } from "react";
import { X, Search, Trash2, Building2, CheckSquare, Square, Check } from "lucide-react";
import { SelectedFilterItem } from "@/features/lic/reports/FilterOptionsModal";

interface CommissionAgencyFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedFilters: SelectedFilterItem[];
  onApplyFilters: (filters: SelectedFilterItem[]) => void;
}

export const SYSTEM_COMMISSION_AGENCIES = [
  { id: "ag002", name: "Jayant Mahabole", code: "AG002", description: "Advisors: A001, A002, A003" },
  { id: "ag003", name: "Manisha Y Mahabole", code: "AG003", description: "Advisors: A004, A005, A006" },
  { id: "ag001", name: "Other Agencies", code: "AG001", description: "All other advisors & direct codes" },
];

export default function CommissionAgencyFilterModal({
  isOpen,
  onClose,
  selectedFilters = [],
  onApplyFilters,
}: CommissionAgencyFilterModalProps) {
  const [searchText, setSearchText] = useState("");
  const [selectedItems, setSelectedItems] = useState<SelectedFilterItem[]>([]);

  // Sync with prop whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedItems(selectedFilters || []);
      setSearchText("");
    }
  }, [isOpen, selectedFilters]);

  const filteredAgencies = useMemo(() => {
    const query = searchText.toLowerCase().trim();
    if (!query) return SYSTEM_COMMISSION_AGENCIES;
    return SYSTEM_COMMISSION_AGENCIES.filter(
      (a) =>
        a.name.toLowerCase().includes(query) ||
        a.code.toLowerCase().includes(query) ||
        a.description.toLowerCase().includes(query)
    );
  }, [searchText]);

  const isAllSelected =
    filteredAgencies.length > 0 &&
    filteredAgencies.every((a) =>
      selectedItems.some((s) => s.type === "Agencies" && (s.id === a.id || s.name.toLowerCase() === a.name.toLowerCase()))
    );

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedItems([]);
    } else {
      const all: SelectedFilterItem[] = filteredAgencies.map((a) => ({
        type: "Agencies",
        id: a.id,
        name: a.name,
      }));
      setSelectedItems(all);
    }
  };

  const toggleItem = (agency: { id: string; name: string; code: string }) => {
    const exists = selectedItems.some(
      (s) => s.type === "Agencies" && (s.id === agency.id || s.name.toLowerCase() === agency.name.toLowerCase())
    );

    if (exists) {
      setSelectedItems((prev) =>
        prev.filter((s) => !(s.type === "Agencies" && (s.id === agency.id || s.name.toLowerCase() === agency.name.toLowerCase())))
      );
    } else {
      setSelectedItems((prev) => [
        ...prev,
        { type: "Agencies", id: agency.id, name: agency.name },
      ]);
    }
  };

  const removeItem = (id: string) => {
    setSelectedItems((prev) => prev.filter((s) => s.id !== id));
  };

  const handleApply = () => {
    onApplyFilters(selectedItems);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Top Accent Line */}
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#1877F2] via-[#2563eb] to-transparent" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-b from-[#1e3a8a] to-[#2563eb] text-white shadow-sm">
              <Building2 size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Filter Options (Agencies)
              </h2>
              <p className="text-xs text-slate-500">
                Select one or more agencies to filter commission data
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

        {/* Search Bar & Select All */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-3 border-b border-slate-200 bg-slate-50/70">
          <button
            type="button"
            onClick={toggleSelectAll}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-[#1877F2] hover:border-blue-200 transition"
          >
            {isAllSelected ? (
              <>
                <CheckSquare size={14} className="text-[#1877F2]" />
                Deselect All
              </>
            ) : (
              <>
                <Square size={14} />
                Select All
              </>
            )}
          </button>

          <div className="relative w-full sm:w-72">
            <input
              type="text"
              placeholder="Search agency name or code..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#1877F2] focus:ring-2 focus:ring-blue-500/15 transition"
            />
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-hidden min-h-[300px]">
          {/* Agency List */}
          <div className="md:col-span-7 border-r border-slate-200 p-4 bg-white overflow-y-auto">
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs divide-y divide-slate-100">
              {filteredAgencies.map((agency) => {
                const isChecked = selectedItems.some(
                  (s) =>
                    s.type === "Agencies" &&
                    (s.id === agency.id || s.name.toLowerCase() === agency.name.toLowerCase())
                );
                return (
                  <label
                    key={agency.id}
                    onClick={() => toggleItem(agency)}
                    className={`flex items-start gap-3.5 p-3.5 cursor-pointer transition select-none ${
                      isChecked ? "bg-blue-50/40" : "hover:bg-slate-50/80 bg-white"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#1877F2] focus:ring-[#1877F2] cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">{agency.name}</span>
                        <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-[10px] font-mono font-semibold text-slate-600">
                          {agency.code}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{agency.description}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Selected Summary Sidebar */}
          <div className="md:col-span-5 p-4 flex flex-col justify-between bg-slate-50/50">
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white h-full flex flex-col shadow-2xs">
              <div className="bg-slate-100/80 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-700">
                <span>Selected Agencies</span>
                <span className="inline-flex items-center justify-center rounded-full bg-[#1877F2] text-white px-2 py-0.5 text-[10px]">
                  {selectedItems.length}
                </span>
              </div>
              <div className="p-3 flex-1 overflow-y-auto space-y-2 max-h-[240px]">
                {selectedItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-slate-400 text-center">
                    <Building2 size={24} className="text-slate-300 mb-1" />
                    <p className="text-xs italic">No agencies selected</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      (All agencies will be included by default)
                    </p>
                  </div>
                ) : (
                  selectedItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between border border-slate-200 rounded-xl p-2.5 bg-white text-xs hover:border-blue-300 transition shadow-2xs"
                    >
                      <span className="font-semibold text-slate-800 truncate pr-2">{item.name}</span>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1 rounded-lg transition shrink-0"
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
            Apply Filter ({selectedItems.length || "All"})
          </button>
        </div>
      </div>
    </div>
  );
}
