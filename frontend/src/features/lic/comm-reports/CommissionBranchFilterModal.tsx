"use client";

import { useState, useMemo, useEffect } from "react";
import { X, Search, Trash2, Building2, CheckSquare, Square, Check } from "lucide-react";

export interface BranchFilterItem {
  id: string;
  branchCode: string;
  branchName: string;
}

interface CommissionBranchFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  branches?: BranchFilterItem[];
  selectedBranches: BranchFilterItem[];
  onApplyBranches: (branches: BranchFilterItem[]) => void;
}

export const SYSTEM_LIC_BRANCHES: BranchFilterItem[] = [
  { id: "b958", branchCode: "958", branchName: "Camp, Pune" },
  { id: "b951", branchCode: "951", branchName: "Shivajinagar, Pune" },
  { id: "b953", branchCode: "953", branchName: "Deccan Gymkhana, Pune" },
  { id: "b955", branchCode: "955", branchName: "Hadapsar, Pune" },
  { id: "b950", branchCode: "950", branchName: "Pune City Main" },
  { id: "b952", branchCode: "952", branchName: "Kothrud, Pune" },
];

export default function CommissionBranchFilterModal({
  isOpen,
  onClose,
  branches = [],
  selectedBranches = [],
  onApplyBranches,
}: CommissionBranchFilterModalProps) {
  const [searchText, setSearchText] = useState("");
  const [selectedItems, setSelectedItems] = useState<BranchFilterItem[]>([]);

  const branchList = useMemo(() => {
    if (branches && branches.length > 0) {
      return branches;
    }
    return SYSTEM_LIC_BRANCHES;
  }, [branches]);

  useEffect(() => {
    if (isOpen) {
      setSelectedItems(selectedBranches || []);
      setSearchText("");
    }
  }, [isOpen, selectedBranches]);

  const filteredBranches = useMemo(() => {
    const query = searchText.toLowerCase().trim();
    if (!query) return branchList;
    return branchList.filter(
      (b) =>
        b.branchCode.toLowerCase().includes(query) ||
        b.branchName.toLowerCase().includes(query)
    );
  }, [branchList, searchText]);

  const isAllSelected =
    filteredBranches.length > 0 &&
    filteredBranches.every((b) =>
      selectedItems.some((s) => s.id === b.id || s.branchCode === b.branchCode)
    );

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedItems([]);
    } else {
      setSelectedItems([...filteredBranches]);
    }
  };

  const toggleItem = (branch: BranchFilterItem) => {
    const exists = selectedItems.some(
      (s) => s.id === branch.id || s.branchCode === branch.branchCode
    );

    if (exists) {
      setSelectedItems((prev) =>
        prev.filter((s) => !(s.id === branch.id || s.branchCode === branch.branchCode))
      );
    } else {
      setSelectedItems((prev) => [...prev, branch]);
    }
  };

  const handleApply = () => {
    onApplyBranches(selectedItems);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-blue-100 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Top Accent Line */}
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#1877F2] via-[#2563eb] to-transparent" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-blue-50 bg-gradient-to-r from-blue-50/50 to-transparent">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-[#1877F2]">
              <Building2 size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Select LIC Branches
              </h3>
              <p className="text-xs text-slate-500">
                Filter outstanding commissions by one or more servicing branch codes.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search & Actions Bar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search branch code or name (e.g. 958, Camp)..."
              className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#1877F2] focus:outline-none focus:ring-2 focus:ring-blue-500/15 transition"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleSelectAll}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-[#1877F2] transition shadow-2xs"
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

            {selectedItems.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedItems([])}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-rose-100 bg-rose-50 text-xs font-semibold text-rose-600 hover:bg-rose-100 transition"
              >
                <Trash2 size={13} />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Branch List */}
        <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-100 space-y-1">
          {filteredBranches.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No matching LIC branches found.
            </div>
          ) : (
            filteredBranches.map((branch) => {
              const isSelected = selectedItems.some(
                (s) => s.id === branch.id || s.branchCode === branch.branchCode
              );

              return (
                <div
                  key={branch.id || branch.branchCode}
                  onClick={() => toggleItem(branch)}
                  className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition border ${
                    isSelected
                      ? "bg-blue-50/70 border-blue-200 shadow-2xs"
                      : "bg-white border-transparent hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-4 w-4 rounded border flex items-center justify-center transition ${
                        isSelected
                          ? "bg-[#1877F2] border-[#1877F2] text-white"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {isSelected && <Check size={12} strokeWidth={3} />}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                        <span>Branch {branch.branchCode}</span>
                        <span className="text-[10px] font-semibold text-[#1877F2] bg-blue-100/60 px-1.5 py-0.5 rounded">
                          LIC
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">{branch.branchName}</div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100 bg-slate-50/80">
          <span className="text-xs font-semibold text-slate-600">
            {selectedItems.length === 0
              ? "All Branches Selected"
              : `${selectedItems.length} branch${selectedItems.length > 1 ? "es" : ""} selected`}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-6 py-2 bg-gradient-to-r from-[#5c67ff] to-[#3a47ff] text-white text-xs font-semibold rounded-xl shadow-md shadow-blue-200 hover:brightness-110 active:scale-[0.98] transition"
            >
              Apply Filter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
