"use client";

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { RootState, AppDispatch } from "@/store/store";
import { fetchFamilyHistories, deleteFamilyHistory, FamilyHistoryItem } from "../familyHistorySlice";
import { Plus, Edit2, Search, Trash2, Filter, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";

interface FamilyHistoryListProps {
  onAdd: () => void;
  onEdit: (id: string) => void;
  onView: (id: string) => void;
}

export function formatFamilyHistoryDate(dateStr: string) {
  if (!dateStr) return "-";
  try {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, "0");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return "-";
  }
}

export default function FamilyHistoryList({ onAdd, onEdit, onView }: FamilyHistoryListProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { records, isLoading, error } = useSelector((s: RootState) => s.familyHistory);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // --- delete confirmation modal state (replaces window.confirm) ---
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  // -------------------------------------------------------------------

  useEffect(() => {
    dispatch(fetchFamilyHistories());
  }, [dispatch]);

  const filteredRecords = records.filter((r) => {
    const query = searchTerm.toLowerCase();
    const groupName = (r.group?.groupName || r.group?.name || "").toLowerCase();
    const groupCode = (r.group?.groupCode || "").toLowerCase();
    const memberName = [r.member?.salutation, r.member?.firstName, r.member?.middleName, r.member?.lastName]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return groupName.includes(query) || groupCode.includes(query) || memberName.includes(query);
  });

  const getFullName = (r: FamilyHistoryItem) => {
    return [r.member?.salutation, r.member?.firstName, r.member?.middleName, r.member?.lastName]
      .filter(Boolean)
      .join(" ");
  };

  const totalItems = filteredRecords.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRecords = filteredRecords.slice(startIndex, startIndex + itemsPerPage);

  // Opens the custom confirmation modal instead of window.confirm
  const requestDelete = (record: FamilyHistoryItem) => {
    const label = getFullName(record) || record.group?.groupName || "this record";
    setDeleteTarget({ id: record.id, label });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await dispatch(deleteFamilyHistory(deleteTarget.id)).unwrap();
      toast.success("Record deleted successfully");
    } catch (err: any) {
      toast.error(err || "Failed to delete record");
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/40">
        <h2 className="text-xl font-bold text-slate-800 tracking-tight">Family History Records</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={onAdd}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg transition-all shadow-sm cursor-pointer"
          >
            <Plus size={16} />
            Add family history
          </button>
        </div>
      </div>

      <div className="p-4 border-b border-slate-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search by group code, group name or member name..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 pl-9 pr-4 text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"
          />
        </div>
      </div>

      {isLoading && records.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
          <p className="text-sm text-slate-500">Loading records...</p>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="text-center py-20 text-slate-500 font-medium">
          No Family History Records available to display.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                <th className="py-3 px-6 text-left">Group Code</th>
                <th className="py-3 px-6 text-left">Group Name</th>
                <th className="py-3 px-6 text-left">Member Name</th>
                <th className="py-3 px-6 text-left">Family History Date</th>
                <th className="py-3 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedRecords.map((record) => (
                <tr key={record.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer">
                  <td
                    onClick={() => onView(record.id)}
                    className="py-3.5 px-6 font-semibold text-blue-600 hover:text-blue-800"
                  >
                    {record.group?.groupCode || "—"}
                  </td>
                  <td
                    onClick={() => onView(record.id)}
                    className="py-3.5 px-6 text-slate-700"
                  >
                    {record.group?.groupName || record.group?.name || "—"}
                  </td>
                  <td
                    onClick={() => onView(record.id)}
                    className="py-3.5 px-6 text-slate-900 font-medium"
                  >
                    {getFullName(record)}
                  </td>
                  <td
                    onClick={() => onView(record.id)}
                    className="py-3.5 px-6 text-slate-600"
                  >
                    {formatFamilyHistoryDate(record.date)}
                  </td>
                  <td className="py-3.5 px-6 text-right flex items-center justify-end gap-2">
                    <button
                      onClick={() => onEdit(record.id)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                      title="Edit Record"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => requestDelete(record)}
                      className="p-1.5 text-slate-400 hover:text-red-650 hover:bg-red-50 rounded transition-colors cursor-pointer"
                      title="Delete Record"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex items-center justify-between px-6 py-4 bg-slate-50/30 border-t border-slate-100 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span>Items per page:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-slate-200 rounded px-2 py-1 text-slate-700 outline-none"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="flex items-center gap-4">
              <span>
                {startIndex + 1}–{Math.min(startIndex + itemsPerPage, totalItems)} of {totalItems}
              </span>
              <div className="flex gap-1">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className="p-1 border border-slate-200 bg-white rounded hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition-colors cursor-pointer"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="p-1 border border-slate-200 bg-white rounded hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition-colors cursor-pointer"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom delete confirmation modal — matches the Customer Group delete modal style */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-50 rounded-xl">
                <AlertTriangle size={22} className="text-red-500" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Family History Record</h3>
                <p className="text-xs text-slate-400">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              Are you sure you want to delete the family history record for{" "}
              <strong>{deleteTarget.label}</strong>?
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                disabled={isDeleting}
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold text-sm rounded-lg shadow-sm transition-colors flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
