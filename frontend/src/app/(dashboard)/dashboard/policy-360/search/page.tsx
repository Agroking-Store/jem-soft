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
import { useMemo, useState } from "react";
import {
  POLICY_360_RECORDS,
  type Policy360Status,
} from "@/features/policy360/mockData";
import {
  EMPTY_FILTERS,
  FilterDrawer,
  type LapsedPolicyFilters,
} from "@/features/policy360/FilterDrawer";

const statusClasses: Record<Policy360Status, string> = {
  Active: "bg-emerald-50 text-emerald-700",
  Lapsed: "bg-rose-50 text-rose-700",
  Matured: "bg-blue-50 text-blue-700",
  Pending: "bg-amber-50 text-amber-700",
  Claimed: "bg-violet-50 text-violet-700",
};

const PAGE_SIZES = [10, 20, 50];

export default function SearchPoliciesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState<LapsedPolicyFilters>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] =
    useState<LapsedPolicyFilters>(EMPTY_FILTERS);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const filteredPolicies = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return POLICY_360_RECORDS.filter((policy) => {
      // Search bar filter (case-insensitive, partial-match)
      if (query) {
        const searchable = [
          policy.policyNumber,
          policy.lifeAssured,
          policy.group,
          policy.plan,
          policy.mobileNumber,
        ]
          .join(" ")
          .toLowerCase();
        if (!searchable.includes(query)) return false;
      }

      // Drawer filters (AND logic)
      const {
        policyHolderName,
        policyNumber,
        planName,
        groupCode,
        premiumAmount,
        sumAssured,
      } = appliedFilters;

      if (
        policyHolderName &&
        !policy.lifeAssured
          .toLowerCase()
          .includes(policyHolderName.toLowerCase())
      ) {
        return false;
      }
      if (
        policyNumber &&
        !policy.policyNumber.toLowerCase().includes(policyNumber.toLowerCase())
      ) {
        return false;
      }
      if (
        planName &&
        !policy.plan.toLowerCase().includes(planName.toLowerCase())
      ) {
        return false;
      }
      if (
        groupCode &&
        !policy.group.toLowerCase().includes(groupCode.toLowerCase())
      ) {
        return false;
      }
      if (
        premiumAmount &&
        !policy.premium.toLowerCase().includes(premiumAmount.toLowerCase())
      ) {
        return false;
      }
      if (
        sumAssured &&
        !policy.sumAssured.toLowerCase().includes(sumAssured.toLowerCase())
      ) {
        return false;
      }

      return true;
    });
  }, [searchTerm, appliedFilters]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredPolicies.length / itemsPerPage),
  );
  const safePage = Math.min(currentPage, totalPages);
  const paginatedPolicies = filteredPolicies.slice(
    (safePage - 1) * itemsPerPage,
    safePage * itemsPerPage,
  );

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
  };

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

  const startItem =
    filteredPolicies.length === 0 ? 0 : (safePage - 1) * itemsPerPage + 1;
  const endItem = Math.min(safePage * itemsPerPage, filteredPolicies.length);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Search Policies</h1>
        <p className="mt-2 text-slate-500">
          Search policies by policy number, customer name, group code or other
          details
        </p>
      </div>

      {/* Search Area */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
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
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search: Policy Number, Customer Name, Group Code..."
            className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/15"
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
      </div>

      {/* Policy Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
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
                  <th key={heading} className="px-4 py-3 font-semibold">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedPolicies.map((policy) => (
                <tr
                  key={policy.policyNumber}
                  className="transition hover:bg-slate-50"
                >
                  <td className="px-4 py-4 font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer">
                    {policy.policyNumber}
                  </td>
                  <td className="px-4 py-4 text-slate-700">
                    {policy.lifeAssured}
                  </td>
                  <td className="px-4 py-4 text-slate-600">{policy.group}</td>
                  <td className="max-w-xs px-4 py-4 text-slate-600">
                    {policy.plan}
                  </td>
                  <td className="px-4 py-4 text-slate-700">{policy.premium}</td>
                  <td className="px-4 py-4 text-slate-600">
                    {policy.premiumDueDate}
                  </td>
                  <td className="px-4 py-4 text-slate-600">
                    {policy.sumAssured}
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses[policy.status]}`}
                    >
                      {policy.status}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <button
                      type="button"
                      className="font-semibold text-blue-600 hover:text-blue-800"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredPolicies.length === 0 && (
          <p className="px-6 py-10 text-center text-sm text-slate-500">
            No policies found matching your search.
          </p>
        )}
      </div>

      {/* Pagination */}
      {filteredPolicies.length > 0 && (
        <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm md:flex-row">
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
              {startItem} – {endItem} of {filteredPolicies.length}
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
