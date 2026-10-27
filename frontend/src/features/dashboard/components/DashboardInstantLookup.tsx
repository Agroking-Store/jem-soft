"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  ShieldCheck,
  User,
  ArrowRight,
  Phone,
  CreditCard,
  Building,
  Sparkles,
  Command,
  CornerDownLeft,
} from "lucide-react";
import type { Policy } from "@/features/policy/policySlice";
import type { CustomerMaster } from "@/features/customers/types";

interface DashboardInstantLookupProps {
  policies: Policy[];
  customers: CustomerMaster[];
  isLoading?: boolean;
}

type FilterCategory = "all" | "policies" | "customers";

const statusColors: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  inforce: "bg-emerald-50 text-emerald-700 border-emerald-200",
  lapsed: "bg-rose-50 text-rose-700 border-rose-200",
  matured: "bg-blue-50 text-blue-700 border-blue-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  claimed: "bg-violet-50 text-violet-700 border-violet-200",
};

export default function DashboardInstantLookup({
  policies,
  customers,
  isLoading = false,
}: DashboardInstantLookupProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<FilterCategory>("all");
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Global hotkey: Ctrl+K, Cmd+K, or "/" to focus search
  useEffect(() => {
    const handleGlobalKeydown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName) ||
        target?.isContentEditable;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
        return;
      }

      if (e.key === "/" && !isInput) {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };

    window.addEventListener("keydown", handleGlobalKeydown);
    return () => window.removeEventListener("keydown", handleGlobalKeydown);
  }, []);

  // Click outside listener to dismiss dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter policies based on query
  const matchedPolicies = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    return policies
      .filter((p) => {
        const polNo = (p.policyNumber || "").toLowerCase();
        const propNo = (p.proposalNumber || "").toLowerCase();
        const planName = (p.product?.productName || "").toLowerCase();
        const planNo = (p.product?.planNumber || "").toLowerCase();
        const holderFirst = (p.CustomerMaster?.firstName || "").toLowerCase();
        const holderLast = (p.CustomerMaster?.lastName || "").toLowerCase();
        const customerName = (p.customer?.name || "").toLowerCase();
        const groupCode = (p.customer?.groupCode || "").toLowerCase();

        return (
          polNo.includes(q) ||
          propNo.includes(q) ||
          planName.includes(q) ||
          planNo.includes(q) ||
          holderFirst.includes(q) ||
          holderLast.includes(q) ||
          customerName.includes(q) ||
          groupCode.includes(q)
        );
      })
      .slice(0, 6);
  }, [policies, query]);

  // Filter customers based on query
  const matchedCustomers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    return customers
      .filter((c) => {
        const first = (c.firstName || "").toLowerCase();
        const middle = (c.middleName || "").toLowerCase();
        const last = (c.lastName || "").toLowerCase();
        const fullName = `${first} ${middle} ${last}`.trim();
        const mobile1 = (c.contactInfo?.mobile1 || "").toLowerCase();
        const mobile2 = (c.contactInfo?.mobile2 || "").toLowerCase();
        const email = (c.contactInfo?.emailPersonal || "").toLowerCase();
        const pan = (c.panNumber || "").toLowerCase();
        const groupCode = (c.group?.groupCode || "").toLowerCase();
        const groupName = (c.group?.groupName || "").toLowerCase();

        return (
          fullName.includes(q) ||
          mobile1.includes(q) ||
          mobile2.includes(q) ||
          email.includes(q) ||
          pan.includes(q) ||
          groupCode.includes(q) ||
          groupName.includes(q)
        );
      })
      .slice(0, 6);
  }, [customers, query]);

  // Combined active list for keyboard navigation
  const activeItems = useMemo(() => {
    const items: Array<
      | { type: "policy"; data: Policy; id: string }
      | { type: "customer"; data: CustomerMaster; id: string }
    > = [];

    if (activeCategory === "all" || activeCategory === "policies") {
      matchedPolicies.forEach((p) =>
        items.push({ type: "policy", data: p, id: `policy-${p.id}` })
      );
    }
    if (activeCategory === "all" || activeCategory === "customers") {
      matchedCustomers.forEach((c) =>
        items.push({ type: "customer", data: c, id: `customer-${c.id}` })
      );
    }
    return items;
  }, [activeCategory, matchedPolicies, matchedCustomers]);

  const handleSelect = (item: (typeof activeItems)[number]) => {
    setIsOpen(false);
    if (item.type === "policy") {
      router.push(`/dashboard/policy-360/search/${item.data.id}`);
    } else {
      router.push(`/dashboard/customers/master/${item.data.id}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < activeItems.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev > 0 ? prev - 1 : activeItems.length - 1
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeItems[selectedIndex]) {
        handleSelect(activeItems[selectedIndex]);
      } else if (query.trim()) {
        // Fallback: jump to full policy 360 search
        router.push(
          `/dashboard/policy-360/search?q=${encodeURIComponent(query.trim())}`
        );
        setIsOpen(false);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const hasQuery = query.trim().length > 0;
  const hasResults = activeItems.length > 0;

  return (
    <div ref={containerRef} className="relative mb-8 w-full">
      {/* Search Input Bar */}
      <div
        className={`relative flex items-center rounded-2xl border bg-white shadow-sm transition-all duration-200 ${
          isOpen
            ? "border-blue-500 ring-4 ring-blue-500/10 shadow-lg shadow-blue-500/5"
            : "border-slate-200/90 hover:border-slate-300 hover:shadow-md"
        }`}
      >
        <div className="flex h-13 w-13 shrink-0 items-center justify-center pl-1 text-[#2563eb]">
          <Search size={21} className="transition-transform duration-200 group-focus-within:scale-110" />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedIndex(0);
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search a policy or customer"
          aria-label="Search policies and customers"
          aria-expanded={isOpen}
          aria-controls="instant-lookup-results"
          role="combobox"
          className="h-13 w-full bg-transparent pr-4 text-[15px] font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none"
        />

        <div className="flex items-center gap-2 pr-3">
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setSelectedIndex(0);
                inputRef.current?.focus();
              }}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              aria-label="Clear search"
            >
              <X size={15} />
            </button>
          )}

          <div className="hidden sm:flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-400 select-none">
            <Command size={11} className="text-slate-400" />
            <span>K</span>
          </div>
        </div>
      </div>

      <p className="mt-2 text-xs text-slate-500 sm:hidden">
        Search by policy number, customer name, or mobile number.
      </p>

      {/* Live Spotlight Dropdown */}
      {isOpen && (
        <div
          id="instant-lookup-results"
          className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xl shadow-blue-950/15 backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {/* Header & Filter Category Tabs */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-4 py-2.5">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setActiveCategory("all");
                  setSelectedIndex(0);
                }}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                  activeCategory === "all"
                    ? "bg-[#1e3a8a] text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-200/60"
                }`}
              >
                All ({matchedPolicies.length + matchedCustomers.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveCategory("policies");
                  setSelectedIndex(0);
                }}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                  activeCategory === "policies"
                    ? "bg-[#1e3a8a] text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-200/60"
                }`}
              >
                Policies ({matchedPolicies.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveCategory("customers");
                  setSelectedIndex(0);
                }}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                  activeCategory === "customers"
                    ? "bg-[#1e3a8a] text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-200/60"
                }`}
              >
                Customers ({matchedCustomers.length})
              </button>
            </div>

            <span className="hidden sm:flex items-center gap-1 text-[11px] font-medium text-slate-400">
              <span>Navigate with</span>
              <kbd className="rounded border border-slate-200 bg-white px-1 font-mono text-[10px] text-slate-600">
                ↑
              </kbd>
              <kbd className="rounded border border-slate-200 bg-white px-1 font-mono text-[10px] text-slate-600">
                ↓
              </kbd>
              <kbd className="rounded border border-slate-200 bg-white px-1 font-mono text-[10px] text-slate-600">
                ↵
              </kbd>
            </span>
          </div>

          {/* Results List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 p-2">
            {!hasQuery && (
              <div className="py-6 px-4 text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600 mb-2">
                  <Sparkles size={20} />
                </div>
                <p className="text-sm font-semibold text-slate-800">
                  Instant Spotlight Lookup
                </p>
                <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
                  Type any <span className="font-semibold text-slate-700">Policy Number</span>,{" "}
                  <span className="font-semibold text-slate-700">Customer Name</span>, or{" "}
                  <span className="font-semibold text-slate-700">Mobile Number</span> to open their full Policy 360 profile.
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => router.push("/dashboard/policy-360/search")}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-600 transition"
                  >
                    <ShieldCheck size={13} className="text-blue-600" />
                    Open Policy 360 Search
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/dashboard/customers")}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-600 transition"
                  >
                    <User size={13} className="text-[#1877F2]" />
                    Browse All Customers
                  </button>
                </div>
              </div>
            )}

            {hasQuery && !hasResults && !isLoading && (
              <div className="py-8 px-4 text-center">
                <p className="text-sm font-semibold text-slate-700">
                  No records match &quot;{query}&quot;
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Try checking the spelling or search by policy number digits.
                </p>
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      router.push(
                        `/dashboard/policy-360/search?q=${encodeURIComponent(
                          query
                        )}`
                      );
                      setIsOpen(false);
                    }}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-100 transition"
                  >
                    <Search size={13} />
                    Search in Advanced Policy 360
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            )}

            {activeItems.map((item, index) => {
              const isSelected = index === selectedIndex;

              if (item.type === "policy") {
                const policy = item.data;
                const customerName =
                  [
                    policy.CustomerMaster?.firstName,
                    policy.CustomerMaster?.lastName,
                  ]
                    .filter(Boolean)
                    .join(" ") ||
                  policy.customer?.name ||
                  "Unknown Customer";

                const status = (
                  policy.status?.statusName ||
                  policy.policyStatus ||
                  "Active"
                ).toLowerCase();
                const statusBadgeStyle =
                  statusColors[status] ||
                  "bg-slate-100 text-slate-700 border-slate-200";

                const planText = policy.product?.planNumber
                  ? `${policy.product.planNumber} - ${policy.product.productName}`
                  : policy.product?.productName || "Insurance Plan";

                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    role="button"
                    tabIndex={0}
                    className={`flex items-center justify-between gap-4 px-4 py-3 cursor-pointer transition-all rounded-xl ${
                      isSelected
                        ? "bg-blue-50/90 text-blue-950 shadow-sm"
                        : "hover:bg-slate-50 text-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-[#1e3a8a] to-[#2563eb] text-white shadow-sm">
                        <ShieldCheck size={18} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 tracking-wide">
                            {policy.policyNumber}
                          </span>
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold capitalize ${statusBadgeStyle}`}
                          >
                            {status}
                          </span>
                          <span className="rounded bg-blue-100/70 px-1.5 py-0.5 text-[10px] font-semibold text-blue-800 uppercase tracking-wider">
                            Policy 360
                          </span>
                        </div>
                        <p className="truncate text-xs text-slate-500 mt-0.5">
                          <span className="font-medium text-slate-700">
                            {customerName}
                          </span>{" "}
                          • {planText}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-3 text-right">
                      {policy.premium?.installmentPremium != null && (
                        <div>
                          <p className="text-xs font-bold text-slate-900">
                            ₹{Number(policy.premium.installmentPremium).toLocaleString("en-IN")}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium">Premium</p>
                        </div>
                      )}
                      <div
                        className={`flex h-7 w-7 items-center justify-center rounded-lg border transition-all ${
                          isSelected
                            ? "border-blue-300 bg-white text-blue-600 shadow-sm"
                            : "border-transparent text-slate-300"
                        }`}
                      >
                        <CornerDownLeft size={13} />
                      </div>
                    </div>
                  </div>
                );
              }

              // Customer Item
              const customer = item.data;
              const fullName = [
                customer.salutation,
                customer.firstName,
                customer.middleName,
                customer.lastName,
              ]
                .filter(Boolean)
                .join(" ");

              const mobile =
                customer.contactInfo?.mobile1 ||
                customer.contactInfo?.mobile2 ||
                "—";
              const groupCode =
                customer.group?.groupCode || customer.group?.groupName;

              return (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  role="button"
                  tabIndex={0}
                  className={`flex items-center justify-between gap-4 px-4 py-3 cursor-pointer transition-all rounded-xl ${
                    isSelected
                      ? "bg-amber-50/70 text-amber-950 shadow-sm"
                      : "hover:bg-slate-50 text-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-[#b45309] to-[#d97706] text-white shadow-sm font-bold text-sm">
                      {customer.firstName?.charAt(0) || "C"}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">
                          {fullName}
                        </span>
                        {customer.isGroupHead && (
                          <span className="rounded-full bg-blue-100 border border-blue-200 px-2 py-0.5 text-[10px] font-bold text-[#1877F2]">
                            Head
                          </span>
                        )}
                        <span className="rounded bg-amber-100/80 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 uppercase tracking-wider">
                          Customer
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                        <span className="inline-flex items-center gap-1">
                          <Phone size={11} className="text-slate-400" />
                          {mobile}
                        </span>
                        {groupCode && (
                          <span className="inline-flex items-center gap-1">
                            <Building size={11} className="text-slate-400" />
                            Group: {groupCode}
                          </span>
                        )}
                        {customer.panNumber && (
                          <span className="inline-flex items-center gap-1">
                            <CreditCard size={11} className="text-slate-400" />
                            PAN: {customer.panNumber}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-3">
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-lg border transition-all ${
                        isSelected
                          ? "border-amber-300 bg-white text-amber-700 shadow-sm"
                          : "border-transparent text-slate-300"
                      }`}
                    >
                      <CornerDownLeft size={13} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer bar */}
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/80 px-4 py-2 text-[11px] text-slate-500">
            <span>
              Showing {activeItems.length} instant matches
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  router.push(
                    `/dashboard/policy-360/search?q=${encodeURIComponent(query)}`
                  );
                  setIsOpen(false);
                }}
                className="font-semibold text-blue-600 hover:underline"
              >
                View full results in Policy 360 →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
