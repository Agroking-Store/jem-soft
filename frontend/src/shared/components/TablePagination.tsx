
"use client";

type Props = {
  currentPage?: number;
  totalPages?: number;
  totalItems: number;
  startIndex?: number;
  endIndex?: number;
  rowsPerPage?: number;
  pageItems?: (number | string)[];
  onPageChange: (page: number) => void;
  onRowsPerPageChange?: (rows: number) => void;

  itemLabel?: string;
  page?: number;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
};

export default function SharedTablePagination(props: Props) {
  const currentPage = props.page ?? props.currentPage ?? 1;
  const rowsPerPage = props.pageSize ?? props.rowsPerPage ?? 10;

  const totalPages =
    props.totalPages ?? Math.max(1, Math.ceil(props.totalItems / rowsPerPage));

  const startIndex =
    props.startIndex ?? (props.totalItems === 0 ? 0 : (currentPage - 1) * rowsPerPage);

  const endIndex =
    props.endIndex ?? Math.min(currentPage * rowsPerPage, props.totalItems);

  const pageItems = props.pageItems ?? (() => {
    const items: (number | string)[] = [];
    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        Math.abs(i - currentPage) <= 1
      ) {
        items.push(i);
      } else if (items[items.length - 1] !== "...") {
        items.push("...");
      }
    }
    return items;
  })();

  const handlePageSizeChange =
    props.onPageSizeChange ?? props.onRowsPerPageChange;

  
return (
  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3">

    <div className="flex items-center gap-2 text-sm text-slate-500">
      <span>Rows per page:</span>

      <select
        value={rowsPerPage}
        onChange={(e) =>
          handlePageSizeChange?.(Number(e.target.value))
        }
        className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none"
      >
        {[10, 20, 50].map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>
    </div>

    <div className="flex flex-wrap items-center gap-2">

      <span className="mr-1 text-sm text-slate-500">
        {startIndex + 1}-{endIndex} of {props.totalItems}
      </span>

      <button
        disabled={currentPage <= 1}
        onClick={() => props.onPageChange(currentPage - 1)}
        className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Previous
      </button>

      {pageItems.map((item, index) =>
        typeof item === "number" ? (
          <button
            key={index}
            onClick={() => props.onPageChange(item)}
            className={`min-w-9 rounded-lg border px-3 py-2 text-sm ${
              currentPage === item
                ? "border-blue-600 bg-blue-600 font-semibold text-white"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {item}
          </button>
        ) : (
          <span key={index} className="px-1 text-slate-500">
            {item}
          </span>
        )
      )}

      <button
        disabled={currentPage >= totalPages}
        onClick={() => props.onPageChange(currentPage + 1)}
        className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Next
      </button>

    </div>
  </div>
);

}
