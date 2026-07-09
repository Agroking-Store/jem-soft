"use client";

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { RootState, AppDispatch } from "@/store/store";
import { fetchFamilyHistories, deleteFamilyHistory, FamilyHistoryItem } from "../familyHistorySlice";
import { Edit2, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";
import { CustomerEmptyState, CustomerTableFrame } from "@/features/customers/components/CustomerUi";

interface FamilyHistoryListProps {
  onAdd: () => void;
  onEdit: (id: string) => void;
  onView: (id: string) => void;
  /** Search term owned by the module-level toolbar (single search box, no duplicate). */
  searchTerm?: string;
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

export default function FamilyHistoryList({ onAdd, onEdit, onView, searchTerm = "" }: FamilyHistoryListProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { records, isLoading, error } = useSelector((s: RootState) => s.familyHistory);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  useEffect(() => {
    dispatch(fetchFamilyHistories());
  }, [dispatch]);

  // Reset to page 1 whenever the shared search term changes.
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

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

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this family history record?")) {
      try {
        await dispatch(deleteFamilyHistory(id)).unwrap();
        toast.success("Record deleted successfully");
      } catch (err: any) {
        toast.error(err || "Failed to delete record");
      }
    }
  };

  if (isLoading && records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-[#0B1220]" />
        <p className="text-sm text-slate-500">Loading records...</p>
      </div>
    );
  }

  if (filteredRecords.length === 0) {
    return (
      <CustomerEmptyState
        title="No family history records"
        description={
          searchTerm
            ? "No records match your search. Try a different group code, group name, or member name."
            : "Add your first family history record to start tracking it here."
        }
        action={
          !searchTerm ? (
            <button
              onClick={onAdd}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0B1220] px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-[#0B1220]/20 transition-colors hover:bg-[#16294D]"
            >
              Add family history
            </button>
          ) : undefined
        }
      />
    );
  }

  return (
    <CustomerTableFrame
      footer={
        <div className="flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>Items per page:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-slate-700 outline-none"
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
                className="cursor-pointer rounded-lg border border-slate-200 bg-white p-1 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="cursor-pointer rounded-lg border border-slate-200 bg-white p-1 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      }
    >
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            <th className="py-3 px-6 text-left">Group Code</th>
            <th className="py-3 px-6 text-left">Group Name</th>
            <th className="py-3 px-6 text-left">Member Name</th>
            <th className="py-3 px-6 text-left">Family History Date</th>
            <th className="py-3 px-6 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {paginatedRecords.map((record) => (
            <tr key={record.id} className="cursor-pointer transition-colors hover:bg-[#0B1220]/[0.025]">
              <td onClick={() => onView(record.id)} className="py-3.5 px-6 font-semibold text-[#B8873A] hover:text-[#16294D]">
                {record.group?.groupCode || "—"}
              </td>
              <td onClick={() => onView(record.id)} className="py-3.5 px-6 text-slate-700">
                {record.group?.groupName || record.group?.name || "—"}
              </td>
              <td onClick={() => onView(record.id)} className="py-3.5 px-6 font-medium text-slate-900">
                {getFullName(record)}
              </td>
              <td onClick={() => onView(record.id)} className="py-3.5 px-6 text-slate-600">
                {formatFamilyHistoryDate(record.date)}
              </td>
              <td className="py-3.5 px-6 text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    onClick={() => onEdit(record.id)}
                    className="cursor-pointer rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-[#B8873A]/10 hover:text-[#B8873A]"
                    title="Edit Record"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(record.id)}
                    className="cursor-pointer rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                    title="Delete Record"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </CustomerTableFrame>
  );
}