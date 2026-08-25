"use client";

import { useState, useMemo } from "react";
import { X, Search, ChevronDown, Trash2, CheckCircle2 } from "lucide-react";
import type { Customer, CustomerMaster } from "@/features/customers/types";

export interface SelectedFilterItem {
  type: string;
  id: string;
  name: string;
  code?: string;
  extra?: string;
  memberId?: string;
  groupId?: string;
}

interface CustomerDataSheetFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  customersMaster: CustomerMaster[];
  agencies?: Array<{ id: string; agencyName: string; agencyCode: string }>;
  policyStatuses?: Array<{ id: string; statusName: string; statusCode: string }>;
  selectedFilters: SelectedFilterItem[];
  onApplyFilters: (filters: SelectedFilterItem[]) => void;
}

export default function CustomerDataSheetFilterModal({
  isOpen,
  onClose,
  customers = [],
  customersMaster = [],
  agencies = [],
  policyStatuses = [],
  selectedFilters: initialSelectedFilters = [],
  onApplyFilters,
}: CustomerDataSheetFilterModalProps) {
  const [filterCategory, setFilterCategory] = useState<string>("Group Memberwise");
  const [searchText, setSearchText] = useState("");
  const [selectedItems, setSelectedItems] = useState<SelectedFilterItem[]>(
    initialSelectedFilters || []
  );
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 9;

  // Build dynamic memberwise list from DB CustomerMaster & Customer
  const groupMemberwiseList = useMemo(() => {
    if (customersMaster && customersMaster.length > 0) {
      return customersMaster.map((cm) => {
        const group = customers.find((c) => c.id === cm.groupId) || cm.group;
        const groupCode = group?.groupCode || "000000";
        const groupHeadName =
          (group as any)?.name || group?.groupName || `${cm.firstName} ${cm.lastName}`;
        const memberFullName = [cm.salutation, cm.firstName, cm.middleName, cm.lastName]
          .filter(Boolean)
          .join(" ")
          .trim();

        return {
          id: cm.id,
          memberId: cm.id,
          groupId: group?.id || cm.groupId || "",
          code: groupCode,
          name: memberFullName || "Client Member",
          groupHeadName: groupHeadName,
          type: "Group Memberwise",
        };
      });
    }

    return customers.map((c) => ({
      id: c.id,
      memberId: c.id,
      groupId: c.id,
      code: c.groupCode || "000000",
      name: c.name || "Client",
      groupHeadName: c.groupName || c.name || "Group Head",
      type: "Group Memberwise",
    }));
  }, [customersMaster, customers]);

  // Build dynamic groups list
  const groupwiseList = useMemo(() => {
    return customers.map((c) => ({
      id: c.id,
      memberId: c.id,
      groupId: c.id,
      code: c.groupCode || "000000",
      name: c.groupName || c.name || "Group",
      groupHeadName: c.name,
      type: "Groups Wise",
    }));
  }, [customers]);

  // Build dynamic agencies list
  const agenciesList = useMemo(() => {
    return agencies.map((a) => ({
      id: a.id,
      memberId: a.id,
      groupId: "",
      code: a.agencyCode,
      name: a.agencyName || a.agencyCode,
      groupHeadName: a.agencyCode,
      type: "Agencies",
    }));
  }, [agencies]);

  // Build dynamic policy status list
  const policyStatusesList = useMemo(() => {
    const list = [
      {
        id: "status-inforce",
        memberId: "status-inforce",
        groupId: "",
        code: "INF",
        name: "Inforce",
        groupHeadName: "Inforce",
        type: "Policy Status",
      },
      {
        id: "status-paidup",
        memberId: "status-paidup",
        groupId: "",
        code: "PUP",
        name: "Fully paid-up",
        groupHeadName: "Paid Up",
        type: "Policy Status",
      },
      {
        id: "status-lapsed",
        memberId: "status-lapsed",
        groupId: "",
        code: "LAP",
        name: "Lapsed",
        groupHeadName: "Lapsed",
        type: "Policy Status",
      },
      {
        id: "status-red-paidup",
        memberId: "status-red-paidup",
        groupId: "",
        code: "RPU",
        name: "Reduced Paid-up",
        groupHeadName: "Reduced Paid Up",
        type: "Policy Status",
      },
    ];
    policyStatuses.forEach((ps) => {
      if (
        ps.statusName &&
        !list.some((l) => l.name.toLowerCase() === ps.statusName.toLowerCase())
      ) {
        list.push({
          id: ps.id,
          memberId: ps.id,
          groupId: "",
          code: ps.statusCode,
          name: ps.statusName,
          groupHeadName: ps.statusName,
          type: "Policy Status",
        });
      }
    });
    return list;
  }, [policyStatuses]);

  // Active items based on selected category
  const activeItemList = useMemo(() => {
    switch (filterCategory) {
      case "Group Memberwise":
        return groupMemberwiseList;
      case "Groups Wise":
      case "Groups":
        return groupwiseList;
      case "Agencies":
        return agenciesList;
      case "Policy Status":
        return policyStatusesList;
      default:
        return groupMemberwiseList;
    }
  }, [filterCategory, groupMemberwiseList, groupwiseList, agenciesList, policyStatusesList]);

  // Filter by search query
  const filteredList = useMemo(() => {
    if (!searchText.trim()) return activeItemList;
    const query = searchText.toLowerCase().trim();
    return activeItemList.filter(
      (item) =>
        (item.code && item.code.toLowerCase().includes(query)) ||
        item.name.toLowerCase().includes(query) ||
        (item.groupHeadName && item.groupHeadName.toLowerCase().includes(query))
    );
  }, [activeItemList, searchText]);

  const totalPages = Math.ceil(filteredList.length / pageSize) || 1;

  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, currentPage, pageSize]);

  const isAllPageSelected =
    paginatedList.length > 0 &&
    paginatedList.every((item) => selectedItems.some((s) => s.id === item.id));

  const toggleSelectAll = () => {
    if (isAllPageSelected) {
      setSelectedItems((prev) =>
        prev.filter((s) => !paginatedList.some((p) => p.id === s.id))
      );
    } else {
      const toAdd: SelectedFilterItem[] = paginatedList
        .filter((item) => !selectedItems.some((s) => s.id === item.id))
        .map((item) => ({
          type: filterCategory,
          id: item.id,
          name: item.name,
          code: item.code,
          extra: item.groupHeadName,
          memberId: item.memberId,
          groupId: item.groupId,
        }));
      setSelectedItems((prev) => [...prev, ...toAdd]);
    }
  };

  const toggleItem = (item: any) => {
    const exists = selectedItems.some((s) => s.id === item.id);
    if (exists) {
      setSelectedItems((prev) => prev.filter((s) => s.id !== item.id));
    } else {
      setSelectedItems((prev) => [
        ...prev,
        {
          type: filterCategory,
          id: item.id,
          name: item.name,
          code: item.code,
          extra: item.groupHeadName,
          memberId: item.memberId,
          groupId: item.groupId,
        },
      ]);
    }
  };

  const removeItem = (id: string) => {
    setSelectedItems((prev) => prev.filter((s) => s.id !== id));
  };

  const clearAllSelected = () => {
    setSelectedItems([]);
  };

  const handleApply = () => {
    onApplyFilters(selectedItems);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B1220]/75 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Accent Gold Bar */}
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#E8C77A] to-transparent" />

        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0B1220] text-white">
          <div className="flex items-center gap-2">
            <h2 className="font-serif text-base font-bold tracking-wider text-[#E8C77A] uppercase">
              Filter Options
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-3 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <span className="font-serif text-xs font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">
              Filter Options :
            </span>
            <div className="relative">
              <select
                value={filterCategory}
                onChange={(e) => {
                  setFilterCategory(e.target.value);
                  setCurrentPage(1);
                }}
                className="appearance-none bg-white border border-slate-300 rounded-xl px-4 py-1.5 pr-8 text-xs font-bold text-slate-800 hover:border-[#B8873A] focus:outline-none focus:ring-2 focus:ring-[#B8873A]/20 shadow-xs cursor-pointer"
              >
                <option value="Group Memberwise">Group Memberwise</option>
                <option value="Groups Wise">Groups Wise</option>
                <option value="Agencies">Agencies</option>
                <option value="Policy Status">Policy Status</option>
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
              className="w-full bg-white border border-slate-300 rounded-xl py-1.5 pl-3 pr-8 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/20 shadow-xs"
            />
            <Search size={15} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        {/* Content Body */}
        <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-hidden min-h-[380px]">
          {/* Left Table Panel */}
          <div className="md:col-span-7 border-r border-slate-200 flex flex-col justify-between p-4 bg-white overflow-hidden">
            <div className="overflow-y-auto flex-1 border border-slate-200 rounded-xl shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-800 font-serif text-[11px] font-bold uppercase tracking-wider sticky top-0 z-10">
                    <th className="py-2.5 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={isAllPageSelected}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-slate-300 text-[#B8873A] focus:ring-[#B8873A] cursor-pointer"
                      />
                    </th>
                    <th className="py-2.5 px-3 w-28">
                      {filterCategory === "Group Memberwise" || filterCategory === "Groups Wise"
                        ? "Group Code"
                        : "Code"}
                    </th>
                    <th className="py-2.5 px-3">
                      {filterCategory === "Group Memberwise"
                        ? "Group"
                        : filterCategory === "Groups Wise"
                        ? "Group Name"
                        : "Name"}
                    </th>
                    <th className="py-2.5 px-3">
                      {filterCategory === "Group Memberwise"
                        ? "Group Head Name"
                        : filterCategory === "Groups Wise"
                        ? "Head Name"
                        : "Category"}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedList.map((item) => {
                    const isChecked = selectedItems.some((s) => s.id === item.id);
                    return (
                      <tr
                        key={item.id}
                        onClick={() => toggleItem(item)}
                        className={`hover:bg-[#B8873A]/5 cursor-pointer transition ${
                          isChecked ? "bg-[#B8873A]/10 font-semibold" : ""
                        }`}
                      >
                        <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleItem(item)}
                            className="w-4 h-4 rounded border-slate-300 text-[#B8873A] focus:ring-[#B8873A] cursor-pointer"
                          />
                        </td>
                        <td className="py-2 px-3 text-slate-700 font-mono text-[11px]">
                          {item.code || "-"}
                        </td>
                        <td className="py-2 px-3 text-slate-900 font-medium">{item.name}</td>
                        <td className="py-2 px-3 text-slate-600 text-[11px]">
                          {item.groupHeadName || "-"}
                        </td>
                      </tr>
                    );
                  })}

                  {paginatedList.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-400 italic">
                        No records found matching current criteria
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between pt-3 text-xs text-slate-600 border-t border-slate-100 mt-2">
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
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(1)}
                  className="px-2 py-1 border border-slate-200 rounded-md disabled:opacity-30 hover:bg-slate-50 text-[11px] font-medium transition cursor-pointer"
                >
                  |&lt;
                </button>
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className="px-2.5 py-1 border border-slate-200 rounded-md disabled:opacity-30 hover:bg-slate-50 text-[11px] font-medium transition cursor-pointer"
                >
                  Prev
                </button>
                <span className="px-3 py-1 bg-[#0B1220] text-white rounded-md font-bold text-[11px]">
                  {currentPage}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="px-2.5 py-1 border border-slate-200 rounded-md disabled:opacity-30 hover:bg-slate-50 text-[11px] font-medium transition cursor-pointer"
                >
                  Next
                </button>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  className="px-2 py-1 border border-slate-200 rounded-md disabled:opacity-30 hover:bg-slate-50 text-[11px] font-medium transition cursor-pointer"
                >
                  &gt;|
                </button>
              </div>
            </div>
          </div>

          {/* Right Selected Items Panel */}
          <div className="md:col-span-5 p-4 flex flex-col justify-between bg-slate-50/60 overflow-hidden">
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white h-full flex flex-col shadow-xs">
              <div className="bg-[#0B1220] px-4 py-2.5 border-b border-slate-200 font-serif text-xs font-bold text-[#E8C77A] uppercase tracking-wider flex items-center justify-between">
                <span>Selected Filter ({selectedItems.length})</span>
                {selectedItems.length > 0 && (
                  <button
                    type="button"
                    onClick={clearAllSelected}
                    className="text-slate-400 hover:text-red-400 text-[10px] lowercase font-sans font-normal hover:underline cursor-pointer"
                  >
                    clear all
                  </button>
                )}
              </div>
              <div className="p-3 flex-1 overflow-y-auto divide-y divide-slate-100">
                {selectedItems.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                    <p className="text-xs italic">
                      No items selected. Select rows from the left table.
                    </p>
                  </div>
                ) : (
                  selectedItems.map((item) => (
                    <div
                      key={item.id}
                      className="py-2 flex items-center justify-between text-xs group"
                    >
                      <div className="space-y-0.5 max-w-[80%]">
                        <div className="font-semibold text-slate-900 truncate">
                          {item.name}
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                          <span className="font-mono">{item.code || ""}</span>
                          {item.extra && <span>• {item.extra}</span>}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="text-slate-400 hover:text-red-600 p-1 transition cursor-pointer"
                        title="Remove"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end px-6 py-3.5 border-t border-slate-200 bg-white">
          <button
            type="button"
            onClick={handleApply}
            className="px-6 py-2 bg-gradient-to-r from-[#B8873A] to-[#D9AE63] text-[#0B1220] font-bold text-xs uppercase tracking-wider rounded-xl shadow-md hover:brightness-105 transition cursor-pointer"
          >
            Apply Filter
          </button>
        </div>
      </div>
    </div>
  );
}
