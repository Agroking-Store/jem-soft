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

  // Build dynamic group list from JEM Soft customers + fallback list matching SS 5 for realistic presentation
  const dynamicGroups = useMemo(() => {
    const list: GroupFilterItem[] = customers
      .filter((c) => c.groupCode || c.name)
      .map((c, idx) => ({
        groupCode: c.groupCode || `M${100 + idx}`,
        groupHeadName: c.groupName || c.name,
      }));

    const defaultSs5Groups: GroupFilterItem[] = [
      { groupCode: "M101", groupHeadName: "Musale Kiran" },
      { groupCode: "000002", groupHeadName: "Irani Marzban" },
      { groupCode: "000006", groupHeadName: "SHAHANE YOGESH" },
      { groupCode: "000007", groupHeadName: "NADGAUDA TRUPTI" },
      { groupCode: "000008", groupHeadName: "Sanghani Chetan" },
      { groupCode: "000009", groupHeadName: "MADANE JAYASHREE" },
      { groupCode: "000010", groupHeadName: "Shah Swagat" },
      { groupCode: "000011", groupHeadName: "Suryawanshi Vanita" },
      { groupCode: "000012", groupHeadName: "Katekar Devang" },
      { groupCode: "000013", groupHeadName: "Sancheti Akshay" },
      { groupCode: "000014", groupHeadName: "Kulkarni Rahul" },
      { groupCode: "000015", groupHeadName: "Deshmukh Priya" },
    ];

    const merged = [...list];
    defaultSs5Groups.forEach((d) => {
      if (!merged.some((m) => m.groupCode === d.groupCode)) {
        merged.push(d);
      }
    });

    return merged;
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

  // All Hooks defined unconditionally above.
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
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-700">Sorting Filter :</span>
            <span className="text-sm font-medium text-slate-600">Groups Wise</span>
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
              className="w-full bg-white border-b border-slate-300 py-1.5 pl-3 pr-8 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-600"
            />
            <Search size={16} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        {/* Main Body Split */}
        <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-hidden min-h-[380px]">
          {/* Left Table Section */}
          <div className="md:col-span-7 border-r border-slate-200 flex flex-col justify-between p-4">
            <div className="border border-slate-200 rounded-md overflow-hidden bg-white">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-blue-50/70 border-b border-slate-200 font-bold text-slate-700">
                    <th className="py-2.5 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={isAllPaginatedSelected}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
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
                        className="hover:bg-slate-50 cursor-pointer transition"
                      >
                        <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleGroup(g)}
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="py-2 px-3 text-slate-600 font-mono font-medium">{g.groupCode}</td>
                        <td className="py-2 px-3 font-semibold text-slate-800 uppercase tracking-tight">
                          {g.groupHeadName}
                        </td>
                      </tr>
                    );
                  })}
                  {paginatedGroups.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-slate-400">
                        No customer groups match your search
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls Footer */}
            <div className="flex items-center justify-between pt-3 text-sm text-slate-600 border-t border-slate-100 mt-2">
              <span className="bg-blue-50 px-3 py-1 rounded text-xs font-medium text-slate-700">
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
                  className="px-2 py-1 border border-slate-200 rounded disabled:opacity-30 hover:bg-slate-50 text-xs"
                >
                  |&lt;
                </button>
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className="px-2.5 py-1 border border-slate-200 rounded disabled:opacity-30 hover:bg-slate-50 text-xs"
                >
                  Prev
                </button>

                {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                  const pNum = i + 1;
                  return (
                    <button
                      key={pNum}
                      onClick={() => setCurrentPage(pNum)}
                      className={`px-3 py-1 rounded text-xs font-semibold ${
                        currentPage === pNum
                          ? "bg-blue-600 text-white"
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
                  className="px-2.5 py-1 border border-slate-200 rounded disabled:opacity-30 hover:bg-slate-50 text-xs"
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

          {/* Right Selected Panel */}
          <div className="md:col-span-5 p-4 flex flex-col justify-between bg-slate-50/40">
            <div className="border border-slate-200 rounded-md overflow-hidden bg-white h-full flex flex-col">
              <div className="bg-blue-50/60 px-4 py-2.5 border-b border-slate-200 font-semibold text-sm text-slate-800 flex items-center justify-between">
                <span>Selected Filter</span>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">
                  {selectedList.length} Selected
                </span>
              </div>

              <div className="p-3 flex-1 overflow-y-auto space-y-2">
                {selectedList.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center pt-8">
                    All groups selected by default. Check specific groups on the left to filter.
                  </p>
                ) : (
                  selectedList.map((g) => (
                    <div
                      key={g.groupCode}
                      className="flex items-center justify-between border border-slate-200 rounded-lg p-2 bg-white text-xs hover:border-blue-300 transition"
                    >
                      <div>
                        <span className="font-mono font-bold text-blue-700 mr-2">{g.groupCode}</span>
                        <span className="font-medium text-slate-800 uppercase">{g.groupHeadName}</span>
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
            className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium text-sm rounded-md shadow-md shadow-blue-500/20 hover:from-blue-700 hover:to-blue-800 transition"
          >
            Apply Filter
          </button>
        </div>
      </div>
    </div>
  );
}
