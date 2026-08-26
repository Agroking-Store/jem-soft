"use client";

import Link from "next/link";
import { ArrowLeft, Download, Filter, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { POLICY_360_RECORDS } from "@/features/policy360/mockData";
import {
  EMPTY_FILTERS,
  FilterDrawer,
  type LapsedPolicyFilters,
} from "@/features/policy360/FilterDrawer";
import {
  CustomerPageHero,
  CustomerToolbar,
} from "@/features/customers/components/CustomerUi";

export default function LapsedPoliciesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState<LapsedPolicyFilters>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] =
    useState<LapsedPolicyFilters>(EMPTY_FILTERS);

  const lapsedPolicies = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return POLICY_360_RECORDS.filter((policy) => {
      if (policy.status !== "Lapsed") return false;

      // Search bar filter
      if (query) {
        const matchesSearch = [
          policy.policyNumber,
          policy.lifeAssured,
          policy.mobileNumber,
          policy.plan,
        ].some((value) => value.toLowerCase().includes(query));
        if (!matchesSearch) return false;
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

  const handleApplyFilters = () => {
    setAppliedFilters(filters);
    setIsFilterOpen(false);
  };

  const handleClearAll = () => {
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <CustomerPageHero
        title="Policy 360"
        subtitle="Monitor policies with overdue premium payments"
      />

      <h2 className="font-serif text-sm font-semibold uppercase tracking-[0.18em] text-slate-700">
        Lapsed Policies
      </h2>

      <CustomerToolbar>
        <Link
          href="/dashboard/policy-360"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
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
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search lapsed policies..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/20"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIsFilterOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <Filter size={16} /> Filter
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl bg-[#0B1220] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#16294D]"
          >
            <Download size={16} /> Export
          </button>
        </div>
      </CustomerToolbar>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full table-fixed divide-y divide-slate-200">
            <thead className="bg-slate-50">
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
              {lapsedPolicies.map((policy) => (
                <tr
                  key={policy.policyNumber}
                  className="group/item transition-colors duration-200 hover:bg-slate-50"
                >
                  <td className="px-4 py-4 font-semibold text-slate-900">
                    {policy.policyNumber}
                  </td>
                  <td className="px-4 py-4 text-slate-700">
                    {policy.lifeAssured}
                  </td>
                  <td className="max-w-xs px-4 py-4 text-slate-600">
                    {policy.plan}
                  </td>
                  <td className="px-4 py-4 text-slate-700">{policy.premium}</td>
                  <td className="px-4 py-4 text-slate-600">
                    {policy.premiumMode}
                  </td>
                  <td className="px-4 py-4 text-slate-600">
                    {policy.premiumDueDate}
                  </td>
                  <td className="px-4 py-4">
                    <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
                      {policy.daysUnpaid}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-slate-600">
                    {policy.mobileNumber}
                  </td>
                  <td className="px-4 py-4">
                    <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
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
        {lapsedPolicies.length === 0 && (
          <p className="px-6 py-10 text-center text-sm text-slate-500">
            No lapsed policies found matching your search.
          </p>
        )}
      </div>

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
