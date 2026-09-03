"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Eye,
  Filter,
  RotateCcw,
  Search,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "@/store/store";
import { fetchPolicies } from "@/features/policy/policySlice";
import { fetchPolicyStatuses } from "@/features/policy/policyStatusMasterSlice";
import {
  EMPTY_FILTERS,
  FilterDrawer,
  type LapsedPolicyFilters,
} from "@/features/policy360/FilterDrawer";
import {
  CustomerPageHero,
  CustomerTableFrame,
  CustomerToolbar,
  CustomerEmptyState,
} from "@/features/customers/components/CustomerUi";
import { Seal } from "@/features/customers/pages/CustomerListPage";

const statusClasses: Record<string, string> = {
  Active: "bg-emerald-50 text-emerald-700",
  Lapsed: "bg-rose-50 text-rose-700",
  Matured: "bg-blue-50 text-blue-700",
  Pending: "bg-amber-50 text-amber-700",
  Claimed: "bg-violet-50 text-violet-700",
};

const fmtCurrency = (value?: number | null) =>
  value == null || isNaN(Number(value))
    ? "—"
    : `₹${Number(value).toLocaleString("en-IN")}`;

const fmtDate = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const PAGE_SIZES = [10, 20, 50];

export default function SearchPoliciesPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { policies, isLoading, error } = useSelector(
    (state: RootState) => state.policies,
  );
  const { statuses } = useSelector((state: RootState) => state.policyStatuses);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState<LapsedPolicyFilters>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] =
    useState<LapsedPolicyFilters>(EMPTY_FILTERS);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    dispatch(fetchPolicyStatuses());
  }, [dispatch]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;

      if (
        target instanceof HTMLElement &&
        (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) ||
          target.isContentEditable ||
          target.closest("button"))
      ) {
        return;
      }

      if (
        event.key.length !== 1 ||
        event.ctrlKey ||
        event.altKey ||
        event.metaKey
      ) {
        return;
      }

      event.preventDefault();
      searchInputRef.current?.focus();
      setSearchTerm((current) => current + event.key);
      setCurrentPage(1);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      dispatch(
        fetchPolicies({
          search: searchTerm.trim() || undefined,
          holderName: appliedFilters.customerName || undefined,
          policyNumber: appliedFilters.policyNumber || undefined,
          planName: appliedFilters.planName || undefined,
          groupCode: appliedFilters.groupCode || undefined,
          premium: appliedFilters.premium || undefined,
          dueDate: appliedFilters.dueDate || undefined,
          sumAssured: appliedFilters.sumAssured || undefined,
          status: appliedFilters.status || undefined,
          page: currentPage,
          limit: itemsPerPage,
        }),
      );
    }, 400);

    return () => window.clearTimeout(timeout);
  }, [appliedFilters, currentPage, dispatch, itemsPerPage, searchTerm]);

  const totalPages = Math.max(
    1,
    policies.length === itemsPerPage ? currentPage + 1 : currentPage,
  );
  const safePage = Math.min(currentPage, totalPages);
  const paginatedPolicies = policies;

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

  const handleReset = () => {
    setSearchTerm("");
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setCurrentPage(1);
    dispatch(fetchPolicies({ page: 1, limit: itemsPerPage }));
  };

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

  const startItem =
    policies.length === 0 ? 0 : (safePage - 1) * itemsPerPage + 1;
  const endItem = startItem === 0 ? 0 : startItem + policies.length - 1;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <CustomerPageHero
        title="Policy 360"
        subtitle="Search and manage policies across all customers"
      />

      <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-700">
        Search Policies
      </h2>

      {/* Search Area */}
      <CustomerToolbar>
        <Link
          href="/dashboard/policy-360"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-[#1877F2]"
        >
          <ArrowLeft size={16} /> Back
        </Link>
        <div className="relative w-full flex-1 lg:max-w-2xl">
          <Search
            size={17}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            ref={searchInputRef}
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search: Policy Number, Customer Name, Group Code..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-[#1877F2] focus:bg-white focus:ring-2 focus:ring-blue-500/15"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-[#1877F2]"
            title="Reset"
          >
            <RotateCcw size={16} />
          </button>
          <button
            type="button"
            onClick={() => setIsFilterOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-[#1877F2]"
            title="Filter"
          >
            <Filter size={16} />
          </button>
        </div>
      </CustomerToolbar>

      {/* Policy Table */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#1877F2] via-[#1877F2]/40 to-transparent" />
        <div className="flex flex-col gap-1 border-b border-slate-100 bg-slate-50/70 px-5 py-4">
          <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-700">
            Search Results
          </h2>
          <p className="text-sm font-medium text-slate-500">
            Policies matching your search across all customers.
          </p>
        </div>
        <div className="p-5">
          <CustomerTableFrame>
            <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  {[
                    "Policy Number",
                    "Customer Name",
                    "Group Code",
                    "Plan",
                    "Premium",
                    "Due Date",
                    "Sum Assured",
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
                {paginatedPolicies.map((policy) => {
                  const customerName =
                    [
                      policy.CustomerMaster?.firstName,
                      policy.CustomerMaster?.lastName,
                    ]
                      .filter(Boolean)
                      .join(" ") || "—";
                  const status =
                    policy.status?.statusName || policy.policyStatus || "—";
                  const groupCode =
                    policy.customer?.groupCode ||
                    policy.customer?.groupName ||
                    "—";
                  const plan = policy.product?.planNumber
                    ? `${policy.product.planNumber} - ${policy.product.productName}`
                    : policy.product?.productName || "—";

                  return (
                    <tr
                      key={policy.id}
                      className="group border-b border-slate-100 transition-colors odd:bg-white even:bg-slate-50/30 hover:bg-blue-50/40"
                    >
                      <td className="whitespace-nowrap px-4 py-3">
                        <Link
                          href={`/dashboard/policy-360/search/${policy.id}`}
                          className="text-sm font-semibold text-blue-600 transition-colors hover:text-blue-800 hover:underline"
                        >
                          {policy.policyNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3 text-left">
                          <Seal name={customerName} size={34} />
                          <span className="text-sm text-slate-600">
                            {customerName}
                          </span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className="text-sm text-slate-600">
                          {groupCode}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-600">{plan}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className="text-sm font-medium text-slate-900">
                          {fmtCurrency(policy.premium?.installmentPremium)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className="text-sm text-slate-600">
                          {fmtDate(policy.nextPremiumDueDate)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className="text-sm font-medium text-slate-900">
                          {fmtCurrency(policy.premium?.sumAssured)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                            statusClasses[status] ||
                            "bg-slate-100 text-slate-700"
                          }`}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                          <Link
                            href={`/dashboard/policy-360/search/${policy.id}`}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                            title="View"
                          >
                            <Eye size={16} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CustomerTableFrame>
        </div>

        {isLoading && (
          <p className="px-6 py-10 text-center text-sm text-slate-500">
            Loading policies...
          </p>
        )}
        {!isLoading && error && (
          <CustomerEmptyState
            title="Something went wrong"
            description={error}
          />
        )}
        {!isLoading && !error && policies.length === 0 && (
          <CustomerEmptyState
            title="No policies found"
            description="No policies match your search. Try a different keyword or reset the filters."
          />
        )}
      </section>

      {/* Pagination */}
      {policies.length > 0 && (
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
              {startItem} – {endItem} of {endItem}
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
        statuses={statuses}
      />
    </div>
  );
}
