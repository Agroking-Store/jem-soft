"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
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
  CustomerToolbar,
} from "@/features/customers/components/CustomerUi";

const statusClasses: Record<string, string> = {
  Active: "bg-emerald-50 text-emerald-700",
  Lapsed: "bg-rose-50 text-rose-700",
  Matured: "bg-blue-50 text-blue-700",
  Pending: "bg-amber-50 text-amber-700",
  Claimed: "bg-violet-50 text-violet-700",
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

      <h2 className="font-serif text-sm font-semibold uppercase tracking-[0.18em] text-slate-700">
        Search Policies
      </h2>

      {/* Search Area */}
      <CustomerToolbar>
        <Link
          href="/dashboard/policy-360"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
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
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/20"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            title="Reset"
          >
            <RotateCcw size={16} />
          </button>
          <button
            type="button"
            onClick={() => setIsFilterOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            title="Filter"
          >
            <Filter size={16} />
          </button>
        </div>
      </CustomerToolbar>

      {/* Policy Table */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full table-fixed divide-y divide-slate-200">
            <thead className="bg-slate-50">
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
                  "Action",
                ].map((heading) => (
                  <th
                    key={heading}
                    className="sticky top-0 z-10 px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
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

                return (
                  <tr
                    key={policy.id}
                    className="group/item transition-colors duration-200 hover:bg-slate-50"
                  >
                    <td className="px-4 py-4 font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer">
                      {policy.policyNumber}
                    </td>
                    <td className="px-4 py-4 text-slate-700">{customerName}</td>
                    <td className="px-4 py-4 text-slate-600">
                      {policy.customer?.groupCode ||
                        policy.customer?.groupName ||
                        "—"}
                    </td>
                    <td className="max-w-xs px-4 py-4 text-slate-600">
                      {policy.product?.planNumber
                        ? `${policy.product.planNumber} - ${policy.product.productName}`
                        : policy.product?.productName || "—"}
                    </td>
                    <td className="px-4 py-4 text-slate-700">
                      {policy.premium?.installmentPremium ?? "—"}
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      {policy.nextPremiumDueDate || "—"}
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      {policy.premium?.sumAssured ?? "—"}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses[status] || "bg-slate-50 text-slate-700"}`}
                      >
                        {status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <Link
                        href={`/dashboard/policy-360/search/${policy.id}`}
                        className="font-semibold text-blue-600 hover:text-blue-800"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {isLoading && (
          <p className="px-6 py-10 text-center text-sm text-slate-500">
            Loading policies...
          </p>
        )}
        {!isLoading && error && (
          <p className="px-6 py-10 text-center text-sm text-slate-500">
            {error}
          </p>
        )}
        {!isLoading && !error && policies.length === 0 && (
          <p className="px-6 py-10 text-center text-sm text-slate-500">
            No policies found matching your search.
          </p>
        )}
      </div>

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
              className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-[#B8873A]"
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
