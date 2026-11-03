"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  startIndex: number;
  endIndex: number;
  rowsPerPage: number;
  pageItems: (number | "ellipsis")[];
  rowsPerPageOptions?: number[];
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rows: number) => void;
}

export default function TablePagination({
  currentPage,
  totalPages,
  totalItems,
  startIndex,
  endIndex,
  rowsPerPage,
  pageItems,
  rowsPerPageOptions = [10, 20, 50],
  onPageChange,
  onRowsPerPageChange,
}: TablePaginationProps) {
  return (
    <div className="border-t border-slate-200 bg-slate-50/60 px-4 py-3">
      <div className="flex flex-col items-center justify-between gap-3 text-xs text-slate-500 sm:flex-row">
        {/* Left: rows per page */}
        <div className="flex items-center gap-2">
          <span className="whitespace-nowrap">Rows per page:</span>
          <select
            value={rowsPerPage}
            onChange={(e) => onRowsPerPageChange(Number(e.target.value))}
            className="rounded-lg border border-slate-200 bg-white py-1.5 pl-2.5 pr-2 text-xs font-semibold text-slate-700 outline-none transition-all focus:border-[#1877F2] focus:ring-2 focus:ring-blue-500/15 cursor-pointer"
          >
            {rowsPerPageOptions.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        {/* Right: range + page controls */}
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          <span className="mr-1 whitespace-nowrap font-medium text-slate-600">
            {totalItems === 0
              ? "0–0 of 0"
              : `${startIndex + 1}–${endIndex} of ${totalItems}`}
          </span>

          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 font-semibold text-slate-600 transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-[#1877F2] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:bg-white disabled:hover:text-slate-600 cursor-pointer"
          >
            <ChevronLeft size={13} />
            Previous
          </button>

          {pageItems.map((item, idx) =>
            item === "ellipsis" ? (
              <span
                key={`ellipsis-${idx}`}
                className="inline-flex h-8 min-w-8 items-center justify-center text-slate-400"
              >
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                onClick={() => onPageChange(item)}
                className={`inline-flex h-8 min-w-8 items-center justify-center rounded-lg border px-2 text-xs font-semibold transition-all cursor-pointer ${
                  currentPage === item
                    ? "border-[#1877F2] bg-[#1877F2] text-white shadow-sm shadow-blue-200"
                    : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-[#1877F2]"
                }`}
              >
                {item}
              </button>
            ),
          )}

          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 font-semibold text-slate-600 transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-[#1877F2] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:bg-white disabled:hover:text-slate-600 cursor-pointer"
          >
            Next
            <ChevronRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}