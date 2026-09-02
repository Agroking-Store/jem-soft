"use client";

import Link from "next/link";
import { ArrowLeft, Download, Filter, Search } from "lucide-react";
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
  CustomerToolbar,
} from "@/features/customers/components/CustomerUi";

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

  const handleApplyFilters = () => {
    setAppliedFilters(filters);
    setIsFilterOpen(false);
  };

  const handleClearAll = () => {
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
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
            onClick={handleExport}
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
              {filteredPolicies.map((policy) => (
                <tr
                  key={policy.policyId}
                  className="group/item transition-colors duration-200 hover:bg-slate-50"
                >
                  <td className="px-4 py-4 font-semibold text-slate-900">
                    {policy.policyNumber}
                  </td>
                  <td className="px-4 py-4 text-slate-700">
                    {policy.lifeAssuredName}
                  </td>
                  <td className="max-w-xs px-4 py-4 text-slate-600">
                    {formatPlan(policy)}
                  </td>
                  <td className="px-4 py-4 text-slate-700">
                    {formatCurrency(policy.premiumAmount)}
                  </td>
                  <td className="px-4 py-4 text-slate-600">
                    {policy.premiumMode}
                  </td>
                  <td className="px-4 py-4 text-slate-600">
                    {formatDate(policy.premiumDueDate)}
                  </td>
                  <td className="px-4 py-4">
                    <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
                      {policy.daysUnpaid}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-slate-600">
                    {policy.mobileNumber ?? "—"}
                  </td>
                  <td className="px-4 py-4">
                    <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
                      {policy.status}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <Link
                      href={`/dashboard/policy-360/search/${policy.policyId}`}
                      className="font-semibold text-blue-600 hover:text-blue-800"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {isLoading && (
          <p className="px-6 py-10 text-center text-sm text-slate-500">
            Loading lapsed policies...
          </p>
        )}
        {!isLoading && error && (
          <p className="px-6 py-10 text-center text-sm text-slate-500">
            {error}
          </p>
        )}
        {!isLoading && !error && lapsedPolicies.length === 0 && (
          <p className="px-6 py-10 text-center text-sm text-slate-500">
            No lapsed policies found
          </p>
        )}
        {!isLoading &&
          !error &&
          lapsedPolicies.length > 0 &&
          filteredPolicies.length === 0 && (
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
