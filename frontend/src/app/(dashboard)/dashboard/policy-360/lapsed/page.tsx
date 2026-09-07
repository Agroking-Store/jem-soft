"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Filter,
  Search,
  ShieldAlert,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { RootState, AppDispatch } from "@/store/store";
import toast from "react-hot-toast";
import { format } from "date-fns";
import {
  EMPTY_FILTERS,
  FilterDrawer,
  type LapsedPolicyFilters,
} from "@/features/policy360/FilterDrawer";
import {
  fetchLapsedPolicies,
  type LapsedPolicy,
} from "@/features/policy360/lapsedPolicySlice";
import {
  CustomerPageHero,
  CustomerTableFrame,
  CustomerToolbar,
  CustomerEmptyState,
} from "@/features/customers/components/CustomerUi";
import { Seal } from "@/features/customers/pages/CustomerListPage";

const PAGE_SIZES = [10, 20, 50];

// Display helpers — same currency/date formats used elsewhere in the project
const formatPlan = (policy: LapsedPolicy) =>
  policy.planNumber
    ? `${policy.planNumber} - ${policy.planName}`
    : policy.planName || "—";

const formatCurrency = (value?: number | null) =>
  value == null || isNaN(Number(value))
    ? "—"
    : `₹${Number(value).toLocaleString("en-IN")}`;

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  // Backend sends premiumDueDate as "yyyy-MM-dd"; parse parts to avoid timezone shifts
  const parts = value.split("-").map(Number);
  if (parts.length === 3 && parts.every((n) => !isNaN(n))) {
    return format(new Date(parts[0], parts[1] - 1, parts[2]), "dd-MMM-yyyy");
  }
  const date = new Date(value);
  return isNaN(date.getTime()) ? "—" : format(date, "dd-MMM-yyyy");
};

export default function LapsedPoliciesPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { lapsedPolicies, isLoading, error } = useSelector(
    (state: RootState) => state.lapsedPolicies,
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState<LapsedPolicyFilters>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] =
    useState<LapsedPolicyFilters>(EMPTY_FILTERS);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    dispatch(fetchLapsedPolicies());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const filteredPolicies = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return lapsedPolicies.filter((policy) => {
      // Search bar filter (Policy No., Life Assured, Plan No., Plan Name, Mobile No.)
      if (query) {
        const matchesSearch = [
          policy.policyNumber,
          policy.lifeAssuredName,
          policy.planNumber ?? "",
          policy.planName,
          policy.mobileNumber ?? "",
        ].some((value) => value.toLowerCase().includes(query));
        if (!matchesSearch) return false;
      }

      // Drawer filters (AND logic)
      const { customerName, policyNumber, planName, premium, dueDate, status } =
        appliedFilters;

      if (
        customerName &&
        !policy.lifeAssuredName
          .toLowerCase()
          .includes(customerName.trim().toLowerCase())
      ) {
        return false;
      }
      if (
        policyNumber &&
        !policy.policyNumber
          .toLowerCase()
          .includes(policyNumber.trim().toLowerCase())
      ) {
        return false;
      }
      if (
        planName &&
        !formatPlan(policy)
          .toLowerCase()
          .includes(planName.trim().toLowerCase())
      ) {
        return false;
      }
      const premiumQuery = premium.trim();
      if (
        premiumQuery &&
        !formatCurrency(policy.premiumAmount).includes(premiumQuery) &&
        !String(policy.premiumAmount).includes(premiumQuery)
      ) {
        return false;
      }
      if (dueDate && policy.premiumDueDate !== dueDate) {
        return false;
      }
      if (
        status &&
        policy.status.toLowerCase() !== status.trim().toLowerCase()
      ) {
        return false;
      }

      return true;
    });
  }, [lapsedPolicies, searchTerm, appliedFilters]);

  // Client-side pagination over the already-filtered lapsed results
  const totalItems = filteredPolicies.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedPolicies = useMemo(
    () =>
      filteredPolicies.slice(
        (safePage - 1) * itemsPerPage,
        safePage * itemsPerPage,
      ),
    [filteredPolicies, safePage, itemsPerPage],
  );
  const startItem = totalItems === 0 ? 0 : (safePage - 1) * itemsPerPage + 1;
  const endItem =
    startItem === 0 ? 0 : startItem + paginatedPolicies.length - 1;

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

  const handleApplyFilters = () => {
    setAppliedFilters(filters);
    setIsFilterOpen(false);
    setCurrentPage(1);
  };

  const handleClearAll = () => {
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setCurrentPage(1);
  };

  const handleExport = () => {
    if (filteredPolicies.length === 0) {
      toast.error("No lapsed policies to export");
      return;
    }

    const headers = [
      "Policy No.",
      "Life Assured",
      "Plan",
      "Premium Amount",
      "Premium Mode",
      "Premium Due Date",
      "Days Unpaid",
      "Mobile No.",
      "Status",
    ];

    const rows = filteredPolicies.map((policy) => [
      policy.policyNumber,
      policy.lifeAssuredName,
      formatPlan(policy),
      formatCurrency(policy.premiumAmount),
      policy.premiumMode,
      formatDate(policy.premiumDueDate),
      policy.daysUnpaid,
      policy.mobileNumber ?? "",
      policy.status,
    ]);

    const escapeCell = (value: string | number) => {
      const cell = String(value ?? "");
      return /[",\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell;
    };

    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCell).join(","))
      .join("\r\n");

    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `lapsed-policies-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(
      `Exported ${filteredPolicies.length} lapsed ${
        filteredPolicies.length === 1 ? "policy" : "policies"
      }`,
    );
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <CustomerPageHero
        title="Lapsed Policies"
        subtitle="Policies with premium unpaid for 60 days or more"
        icon={ShieldAlert}
      />

      <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-700">
        Lapsed Policies
      </h2>

      <CustomerToolbar>
        <Link
          href="/dashboard/policy-360"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-[#1877F2]"
        >
          <ArrowLeft size={17} /> Back
        </Link>
        <div className="relative w-full lg:max-w-md">
          <Search
            size={17}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search lapsed policies..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-[#1877F2] focus:bg-white focus:ring-2 focus:ring-blue-500/15"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIsFilterOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-[#1877F2]"
          >
            <Filter size={16} /> Filter
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#5c67ff] to-[#3a47ff] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-200 transition-all hover:brightness-110 active:scale-[0.98]"
          >
            <Download size={16} /> Export
          </button>
        </div>
      </CustomerToolbar>

      {/* Lapsed Policy Table */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#1877F2] via-[#1877F2]/40 to-transparent" />
        <div className="flex flex-col gap-1 border-b border-slate-100 bg-slate-50/70 px-5 py-4">
          <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-700">
            Lapsed Policies
          </h2>
          <p className="text-sm font-medium text-slate-500">
            Policies with premium payments overdue by 60 days or more.
          </p>
        </div>
        <div className="p-5">
          <CustomerTableFrame>
            <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr>
                  {[
                    "Policy No.",
                    "Life Assured",
                    "Plan",
                    "Premium Amount",
                    "Premium Mode",
                    "Premium Due Date",
                    "Days Unpaid",
                    "Mobile No.",
                    "Status",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="border-b border-slate-100 bg-slate-50/70 px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400"
                    >
                      {heading}
                    </th>
                  ))}
                  <th className="border-b border-slate-100 bg-slate-50/70 px-4 py-3 text-right text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {paginatedPolicies.map((policy) => (
                  <tr
                    key={policy.policyId}
                    className="group border-b border-slate-100 transition-colors odd:bg-white even:bg-slate-50/30 hover:bg-blue-50/40"
                  >
                    <td className="whitespace-nowrap px-4 py-3">
                      <Link
                        href={`/dashboard/policy-360/search/${policy.policyId}`}
                        className="text-sm font-semibold text-blue-600 transition-colors hover:text-blue-800 hover:underline"
                      >
                        {policy.policyNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 text-left">
                        <Seal name={policy.lifeAssuredName} size={34} />
                        <span className="text-sm text-slate-600">
                          {policy.lifeAssuredName}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-600">
                        {formatPlan(policy)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="text-sm font-medium text-slate-900">
                        {formatCurrency(policy.premiumAmount)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="text-sm text-slate-600">
                        {policy.premiumMode}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="text-sm text-slate-600">
                        {formatDate(policy.premiumDueDate)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {policy.daysUnpaid}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="text-sm text-slate-600">
                        {policy.mobileNumber ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {policy.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                        <Link
                          href={`/dashboard/policy-360/search/${policy.policyId}`}
                          className="rounded-lg p-1.5 text-blue-600 transition hover:bg-blue-50"
                          title="View"
                        >
                          <Eye size={16} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CustomerTableFrame>
        </div>

        {isLoading && (
          <p className="px-6 py-10 text-center text-sm text-slate-500">
            Loading lapsed policies...
          </p>
        )}
        {!isLoading && error && (
          <CustomerEmptyState
            title="Something went wrong"
            description={error}
          />
        )}
        {!isLoading && !error && lapsedPolicies.length === 0 && (
          <CustomerEmptyState
            title="No lapsed policies found"
            description="There are no lapsed policies in the database right now."
          />
        )}
        {!isLoading &&
          !error &&
          lapsedPolicies.length > 0 &&
          filteredPolicies.length === 0 && (
            <CustomerEmptyState
              title="No matching policies"
              description="No lapsed policies match your search. Try a different keyword."
            />
          )}
      </section>

      {/* Pagination */}
      {filteredPolicies.length > 0 && (
        <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.05)] md:flex-row">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span>Items per page:</span>
            <select
              value={itemsPerPage}
              onChange={(event) =>
                handleItemsPerPageChange(Number(event.target.value))
              }
              className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-[#1877F2] focus:ring-2 focus:ring-blue-500/15"
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600">
              {startItem} – {endItem} of {totalItems}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() =>
                  setCurrentPage((page) => Math.min(totalPages, page + 1))
                }
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <FilterDrawer
        open={isFilterOpen}
        filters={filters}
        onClose={() => setIsFilterOpen(false)}
        onChange={setFilters}
        onApply={handleApplyFilters}
        onClear={handleClearAll}
      />
    </div>
  );
}
