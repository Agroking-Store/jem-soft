"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { LucideIcon } from "lucide-react";
import { Check, ChevronDown, Search as SearchIcon } from "lucide-react";

export function CustomerPageHero({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
      <div className="bg-gradient-to-r from-[#0B1220] via-[#132342] to-[#16294D] px-6 py-5 sm:px-7 sm:py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="mt-2 font-serif text-2xl font-semibold tracking-tight sm:text-[28px]" style={{ color: "#e8c77a" }}>
              {title}
            </h1>
            {subtitle && (
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#e8c77a]/80">
                {subtitle}
              </p>
            )}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      </div>
    </div>
  );
}

/**
 * CustomerSectionCard
 * A shared "Ledger Identity" section shell: thin brass-gold top accent,
 * serif uppercase heading, consistent border/shadow treatment.
 * Used across list, details, edit, create and module sub-pages.
 */
export function CustomerSectionCard({
  title,
  icon: Icon,
  children,
  actions,
  subtitle,
  className,
}: {
  title: string;
  icon?: LucideIcon;
  children: ReactNode;
  actions?: ReactNode;
  subtitle?: string;
  className?: string;
}) {
  return (
    <section className={`relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)] ${className}`}>
      <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#B8873A]/40 to-transparent" />
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50/90 px-5 py-4">
        <div className="flex items-start gap-3">
          {Icon ? (
            <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl bg-[#B8873A]/10 text-[#B8873A]">
              <Icon size={16} />
            </div>
          ) : null}
          <div>
            <h2 className="font-serif text-sm font-semibold uppercase tracking-[0.18em] text-slate-700">
              {title}
            </h2>
            {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function CustomerStatCard({
  label,
  value,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  tone?: "neutral" | "accent" | "success" | "warning";
}) {
  const tones = {
    neutral: { chip: "bg-slate-50 text-slate-700", bar: "from-slate-300 to-slate-200" },
    accent: { chip: "bg-[#B8873A]/10 text-[#B8873A]", bar: "from-[#B8873A] to-[#E8C77A]" },
    success: { chip: "bg-emerald-50 text-emerald-700", bar: "from-emerald-400 to-emerald-200" },
    warning: { chip: "bg-amber-50 text-amber-700", bar: "from-amber-400 to-amber-200" },
  };
  const t = tones[tone];

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(15,23,42,0.09)]">
      <div className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r ${t.bar}`} />
      <div className="flex items-center gap-3">
        {Icon ? (
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${t.chip}`}>
            <Icon size={16} />
          </div>
        ) : null}
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            {label}
          </p>
          <p className="mt-1 font-serif text-xl font-semibold tracking-tight text-slate-900">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

export function CustomerEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-6 py-12 text-center">
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{description}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function CustomerBreadcrumbs({
  items,
}: {
  items: Array<{ label: string; href?: string }>;
}) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-xs">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const content = (
          <span
            className={`font-medium ${
              isLast ? "text-slate-600" : "text-slate-400 transition-colors hover:text-slate-600"
            }`}
          >
            {item.label}
          </span>
        );

        return (
          <div key={`${item.label}-${index}`} className="flex items-center gap-2">
            {index > 0 && <span className="text-slate-300">/</span>}
            {item.href && !isLast ? <Link href={item.href}>{content}</Link> : content}
          </div>
        );
      })}
    </nav>
  );
}

export function CustomerToolbar({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)] lg:flex-row lg:items-center lg:justify-between">
      {children}
    </div>
  );
}

export function CustomerTableFrame({
  children,
  footer,
}: {
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
      <div className="overflow-x-auto">{children}</div>
      {footer && <div className="border-t border-slate-200 bg-slate-50/60 px-4 py-3">{footer}</div>}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
 * Shared "shadcn-style" searchable dropdowns.
 * Two flavors:
 *  - SearchableSelect: full form field (label, border box, icon) — used in forms.
 *  - FilterSelect: compact pill trigger — used in list toolbars (e.g. "All Statuses").
 * Both share the same search-first popover pattern so every dropdown in the
 * module behaves consistently.
 * ──────────────────────────────────────────────────────────────── */

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

export interface SelectOptionGroup {
  label: string;
  options: SelectOption[];
  isCollapsible?: boolean;
}

function useOutsideClose(onClose: () => void, refs: React.RefObject<HTMLElement>[]) {
  useEffect(() => {
    function handle(e: MouseEvent) {
      const target = e.target as Node;
      const isInside = refs.some((r) => r.current && r.current.contains(target));
      if (!isInside) onClose();
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [onClose, refs]);
}

function DropdownPanel({
  query,
  onQueryChange,
  searchPlaceholder,
  options: optionsOrGroups,
  value,
  onSelect,
  style,
  panelRef,
}: {
  query: string;
  onQueryChange: (v: string) => void;
  searchPlaceholder: string;
  options: (SelectOption | SelectOptionGroup)[];
  value?: string;
  onSelect: (value: string) => void;
  style: React.CSSProperties;
  panelRef: React.RefObject<HTMLDivElement>;
}) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Auto-focus the search input when the panel opens.
  // A small timeout ensures the element is rendered and ready for focus.
  useEffect(() => {
    const timer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const toggleGroup = (label: string) => {
    setCollapsedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(label)) {
        newSet.delete(label);
      } else {
        newSet.add(label);
      }
      return newSet;
    });
  };

  const hasQuery = query.trim().length > 0;

  const filterOption = (o: SelectOption) =>
    `${o.label} ${o.sublabel || ""}`.toLowerCase().includes(query.toLowerCase());

  const allOptions = optionsOrGroups.flatMap(item => 'options' in item ? item.options : [item]);
  const hasAnyResults = allOptions.some(filterOption);

  // Rendered in a portal to document.body so it overlays above any
  // overflow:hidden / overflow:auto parent (cards, modal shells) instead of
  // being clipped. Position is controlled by the `style` prop (fixed coords).
  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      ref={panelRef}
      style={style}
      className="absolute z-[1000] mt-1.5 w-full min-w-[220px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.14)]"
    >
      <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5">
        <SearchIcon size={14} className="shrink-0 text-slate-400" />
        <input
          ref={searchInputRef}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full text-sm text-slate-900 outline-none placeholder:text-slate-400"
          
        />
      </div>
      <div className="max-h-60 overflow-y-auto py-1">
        {!hasAnyResults ? (
          <p className="px-3 py-4 text-center text-sm text-slate-400">No results found</p>
        ) : (
          optionsOrGroups.map((item, index) => {
            if ('options' in item) { // It's a group
              const filteredGroupOptions = item.options.filter(filterOption);
              if (filteredGroupOptions.length === 0) return null;

              const isCollapsed = !hasQuery && item.isCollapsible && collapsedGroups.has(item.label);

              return (
                <div key={item.label}>
                  {item.isCollapsible ? (
                     <button type="button" onClick={() => toggleGroup(item.label)} className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400 hover:bg-slate-50">
                       <span>{item.label}</span>
                       <ChevronDown size={14} className={`transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                     </button>
                  ) : (
                    <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400">{item.label}</div>
                  )}
                  {!isCollapsed && filteredGroupOptions.map(opt => (
                    <button key={opt.value} type="button" onClick={() => onSelect(opt.value)} className={`flex w-full items-center justify-between gap-2 pl-6 pr-3 py-2.5 text-left text-sm transition-colors hover:bg-[#B8873A]/8 ${opt.value === value ? "bg-[#B8873A]/10 font-semibold text-[#0B1220]" : "text-slate-700"}`}>
                      <span className="min-w-0">
                        <span className="block truncate">{opt.label}</span>
                        {opt.sublabel && <span className="block truncate text-xs text-slate-400">{opt.sublabel}</span>}
                      </span>
                      {opt.value === value && <Check size={14} className="shrink-0 text-[#B8873A]" />}
                    </button>
                  ))}
                </div>
              );
            } else { // It's a single option
              if (!filterOption(item)) return null;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => onSelect(item.value)}
                  className={`flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-[#B8873A]/8 ${
                    item.value === value ? "bg-[#B8873A]/10 font-semibold text-[#0B1220]" : "text-slate-700"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate">{item.label}</span>
                    {item.sublabel && <span className="block truncate text-xs text-slate-400">{item.sublabel}</span>}
                  </span>
                  {item.value === value && <Check size={14} className="shrink-0 text-[#B8873A]" />}
                </button>
              );
            }
          })
        )}
      </div>
    </div>,
    document.body
  );
}

export function SearchableSelect({
  label,
  required,
  error,
  options: optionsOrGroups,
  value,
  onChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  icon,
  disabled,
}: {
  label?: string;
  required?: boolean;
  error?: string;
  options: (SelectOption | SelectOptionGroup)[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  icon?: ReactNode;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pos, setPos] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const ref = useOutsideClose(
    () => {
      setOpen(false);
      setQuery("");
    },
    [triggerRef, panelRef]
  );

  // Compute fixed position from the trigger's rect so the portal panel
  // overlays above any overflow:hidden parent instead of being clipped.
  useLayoutEffect(() => {
    if (open && triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      setPos({
        position: "fixed",
        top: r.bottom + 6,
        left: r.left,
        width: r.width,
      });
    }
  }, [open]);

  const allOptions = optionsOrGroups.flatMap(item => 'options' in item ? item.options : [item]);
  const selected = allOptions.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative">
      {label && (
        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          {label}
          {required && <span className="ml-0.5 text-rose-500">*</span>}
        </label>
      )}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`relative flex w-full items-center justify-between gap-2 rounded-xl border bg-white py-2.75 text-sm outline-none transition-all
          ${icon ? "pl-9 pr-3" : "px-3"}
          ${error ? "border-rose-300 bg-rose-50/30" : "border-slate-200 hover:border-slate-300"}
          ${open ? "border-[#B8873A] ring-2 ring-[#B8873A]/15" : ""}
          ${disabled ? "cursor-not-allowed bg-slate-50 text-slate-400" : "cursor-pointer text-slate-900"}`}
      >
        {icon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>
        )}
        <span className={`truncate text-left ${!selected ? "text-slate-400" : ""}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown size={15} className={`shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}

      {open && (
        <DropdownPanel
          query={query}
          onQueryChange={setQuery}
          searchPlaceholder={searchPlaceholder}
          options={optionsOrGroups}
          value={value}
          onSelect={(v) => {
            onChange(v);
            setOpen(false);
            setQuery("");
          }}
          style={pos}
          panelRef={panelRef}
        />
      )}
    </div>
  );
}

/** Shared date formatter for family history dates (dd-MMM-yyyy). */
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

/** Compact pill-style dropdown for list-page toolbars, e.g. "All Statuses". */
export function FilterSelect({
  icon: Icon,
  options,
  value,
  onChange,
  placeholder = "All",
  searchPlaceholder = "Search...",
}: {
  icon?: LucideIcon;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pos, setPos] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const ref = useOutsideClose(
    () => {
      setOpen(false);
      setQuery("");
    },
    [triggerRef, panelRef]
  );

  // Compute fixed position from the trigger's rect so the portal panel
  // overlays above any overflow:hidden parent instead of being clipped.
  useLayoutEffect(() => {
    if (open && triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      setPos({
        position: "fixed",
        top: r.bottom + 6,
        left: r.left,
        width: r.width,
      });
    }
  }, [open]);

  const selected = options.find((o) => o.value === value);
  const active = Boolean(selected);

  return (
    <div ref={ref} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition-all ${
          active || open
            ? "border-[#B8873A] bg-[#B8873A]/10 text-[#B8873A]"
            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
        }`}
      >
        {Icon && <Icon size={14} />}
        {selected ? selected.label : placeholder}
        <ChevronDown size={13} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <DropdownPanel
          query={query}
          onQueryChange={setQuery}
          searchPlaceholder={searchPlaceholder}
          options={options}
          value={value}
          onSelect={(v) => {
            onChange(v);
            setOpen(false);
            setQuery("");
          }}
          style={pos}
          panelRef={panelRef}
        />
      )}
    </div>
  );
}
