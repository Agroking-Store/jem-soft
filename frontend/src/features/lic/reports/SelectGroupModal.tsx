"use client";

import { useState, useMemo } from "react";
import { X, Search, Trash2 } from "lucide-react";

export interface GroupFilterItem {
  groupCode: string;
  groupHeadName: string;
}

interface SelectGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Array<{ id: string; groupCode?: string | null; name: string; groupName?: string | null }>;
  selectedGroups: GroupFilterItem[];
  onApplyGroups: (groups: GroupFilterItem[]) => void;
}

export default function SelectGroupModal({
  isOpen,
  onClose,
  customers = [],
  selectedGroups: initialSelectedGroups = [],
  onApplyGroups,
}: SelectGroupModalProps) {
  const [searchText, setSearchText] = useState("");
  const [selectedList, setSelectedList] = useState<GroupFilterItem[]>(initialSelectedGroups);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 9;

  // STRICTLY DYNAMIC: Map pure database customers only, no screenshot mock names!
  const dynamicGroups = useMemo(() => {
    return customers
      .filter((c) => Boolean(c.name || c.groupName || c.groupCode))
      .map((c, idx) => ({
        groupCode: c.groupCode || `GRP-${(idx + 1).toString().padStart(3, "0")}`,
        groupHeadName: c.groupName || c.name,
      }));
  }, [customers]);

  const filteredGroups = useMemo(() => {
    if (!searchText.trim()) return dynamicGroups;
    const query = searchText.toLowerCase();
    return dynamicGroups.filter(
      (g) =>
        g.groupCode.toLowerCase().includes(query) ||
        g.groupHeadName.toLowerCase().includes(query)
    );
  }, [dynamicGroups, searchText]);

  const totalItems = filteredGroups.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  const paginatedGroups = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredGroups.slice(start, start + pageSize);
  }, [filteredGroups, currentPage]);

  const isAllPaginatedSelected =
    paginatedGroups.length > 0 &&
    paginatedGroups.every((g) =>
      selectedList.some((s) => s.groupCode === g.groupCode)
    );

  if (!isOpen) return null;

  const toggleSelectAll = () => {
    if (isAllPaginatedSelected) {
      setSelectedList((prev) =>
        prev.filter((s) => !paginatedGroups.some((p) => p.groupCode === s.groupCode))
      );
    } else {
      const additions = paginatedGroups.filter(
        (g) => !selectedList.some((s) => s.groupCode === g.groupCode)
      );
      setSelectedList((prev) => [...prev, ...additions]);
    }
  };

  const toggleGroup = (group: GroupFilterItem) => {
    const exists = selectedList.some((s) => s.groupCode === group.groupCode);
    if (exists) {
      setSelectedList((prev) => prev.filter((s) => s.groupCode !== group.groupCode));
    } else {
      setSelectedList((prev) => [...prev, group]);
    }
  };

  const removeGroup = (groupCode: string) => {
    setSelectedList((prev) => prev.filter((s) => s.groupCode !== groupCode));
  };

  const handleApply = () => {
    onApplyGroups(selectedList);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B1220]/70 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Customer Module Top Gold Accent Line */}
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#E8C77A] to-transparent" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-[#0B1220] text-white">
          <div>
            <h2 className="font-serif text-lg font-bold tracking-wider text-[#E8C77A] uppercase">
              Filter Options
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Sorting Filter : Groups Wise (Dynamic JEM Soft DB Customers)
            </p>
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
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-3 border-b border-slate-200 bg-slate-50/90">
          <div className="flex items-center gap-2">
            <span className="font-serif text-xs font-bold text-slate-700 uppercase tracking-wider">
              Mode:
            </span>
            <span className="text-xs font-semibold text-slate-700 bg-slate-200 px-2.5 py-1 rounded-md">
              Groups Wise
            </span>
          </div>

          <div className="relative w-full sm:w-80">
            <input
              type="text"
              placeholder="Search Customer Group or Head Name..."
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

        {/* Main Body Split */}
        <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-hidden min-h-[380px]">
          {/* Left Table Section */}
          <div className="md:col-span-7 border-r border-slate-200 flex flex-col justify-between p-4 bg-white">
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100/90 border-b border-slate-200 font-serif text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                    <th className="py-2.5 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={isAllPaginatedSelected}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-slate-300 text-[#B8873A] focus:ring-[#B8873A]"
                      />
                    </th>
                    <th className="py-2.5 px-3 w-28">Group Code</th>
                    <th className="py-2.5 px-3">Group Head Name</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedGroups.map((g) => {
                    const isChecked = selectedList.some((s) => s.groupCode === g.groupCode);
                    return (
                      <tr
                        key={g.groupCode}
                        onClick={() => toggleGroup(g)}
                        className="hover:bg-[#B8873A]/5 cursor-pointer transition"
                      >
                        <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleGroup(g)}
                            className="w-4 h-4 rounded border-slate-300 text-[#B8873A] focus:ring-[#B8873A]"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 font-mono font-bold text-xs">{g.groupCode}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900 tracking-tight">
                          {g.groupHeadName}
                        </td>
                      </tr>
                    );
                  })}
                  {paginatedGroups.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-12 text-center text-xs text-slate-400 space-y-1">
                        <p className="font-semibold text-slate-600">No customer groups found in database</p>
                        <p className="text-[11px] text-slate-400">Add customer groups in Customer Module to see them listed here.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls Footer */}
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

          {/* Right Selected Panel */}
          <div className="md:col-span-5 p-4 flex flex-col justify-between bg-slate-50/60">
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white h-full flex flex-col shadow-xs">
              <div className="bg-[#0B1220] px-4 py-2.5 border-b border-slate-200 font-serif text-xs font-bold text-[#E8C77A] uppercase tracking-wider flex items-center justify-between">
                <span>Selected Customer Groups</span>
                <span className="text-[10px] bg-[#B8873A] text-white px-2.5 py-0.5 rounded-full font-bold">
                  {selectedList.length} Selected
                </span>
              </div>

              <div className="p-3 flex-1 overflow-y-auto space-y-2">
                {selectedList.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center pt-8">
                    All groups selected by default. Check specific groups on the left to filter report output.
                  </p>
                ) : (
                  selectedList.map((g) => (
                    <div
                      key={g.groupCode}
                      className="flex items-center justify-between border border-slate-200 rounded-lg p-2.5 bg-white text-xs hover:border-[#B8873A] transition"
                    >
                      <div>
                        <span className="font-mono font-bold text-[#B8873A] mr-2">{g.groupCode}</span>
                        <span className="font-semibold text-slate-900">{g.groupHeadName}</span>
                      </div>
                      <button
                        onClick={() => removeGroup(g.groupCode)}
                        className="text-slate-400 hover:text-red-600 transition p-1"
                        title="Remove group"
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
