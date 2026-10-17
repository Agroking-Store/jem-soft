import { X } from "lucide-react";
import { useEffect, useState } from "react";

export interface LapsedPolicyFilters {
  customerName: string;
  policyNumber: string;
  groupCode: string;
  planName: string;
  premium: string;
  dueDate: string;
  sumAssured: string;
  status: string;
}

export const EMPTY_FILTERS: LapsedPolicyFilters = {
  customerName: "",
  policyNumber: "",
  groupCode: "",
  planName: "",
  premium: "",
  dueDate: "",
  sumAssured: "",
  status: "",
};

interface FilterDrawerProps {
  open: boolean;
  filters: LapsedPolicyFilters;
  onClose: () => void;
  onChange: (filters: LapsedPolicyFilters) => void;
  onApply: () => void;
  onClear: () => void;
  statuses?: Array<{
    id: string;
    statusName: string;
    statusCode: string;
  }>;
}

export function FilterDrawer({
  open,
  filters,
  onClose,
  onChange,
  onApply,
  onClear,
  statuses = [],
}: FilterDrawerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
    } else {
      const timer = setTimeout(() => setMounted(false), 300);
      return () => clearTimeout(timer);
    }
  }, [open]);

  if (!mounted) return null;

  const updateField = (field: keyof LapsedPolicyFilters, value: string) => {
    onChange({ ...filters, [field]: value });
  };

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-slate-900/50 transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        className={`absolute right-0 top-0 flex h-full w-full max-w-[430px] flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-label="Filter Options"
      >
        {/* Header */}
        <header className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Filter Options
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close filters"
          >
            <X size={20} />
          </button>
        </header>

        {/* Body */}
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          <Field
            label="Policy Number"
            placeholder="Enter Policy Number"
            value={filters.policyNumber}
            onChange={(value) => updateField("policyNumber", value)}
          />
          <Field
            label="Customer Name"
            placeholder="Enter Customer Name"
            value={filters.customerName}
            onChange={(value) => updateField("customerName", value)}
          />
          <Field
            label="Group Code"
            placeholder="Enter Group Code"
            value={filters.groupCode}
            onChange={(value) => updateField("groupCode", value)}
          />
          <Field
            label="Plan"
            placeholder="Enter Plan"
            value={filters.planName}
            onChange={(value) => updateField("planName", value)}
          />
          <Field
            label="Premium"
            placeholder="Enter Premium"
            value={filters.premium}
            onChange={(value) => updateField("premium", value)}
            type="number"
          />
          <Field
            label="Due Date"
            placeholder=""
            value={filters.dueDate}
            onChange={(value) => updateField("dueDate", value)}
            type="date"
          />
          <Field
            label="Sum Assured"
            placeholder="Enter Sum Assured"
            value={filters.sumAssured}
            onChange={(value) => updateField("sumAssured", value)}
            type="number"
          />
          <SelectField
            label="Status"
            value={filters.status}
            onChange={(value) => updateField("status", value)}
            statuses={statuses}
          />
        </div>

        {/* Footer */}
        <footer className="flex shrink-0 gap-3 border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            onClick={onClear}
            className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Clear All
          </button>
          <button
            type="button"
            onClick={onApply}
            className="flex-1 rounded-xl bg-gradient-to-r from-[#5c67ff] to-[#3a47ff] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-200 transition-all hover:brightness-110 active:scale-[0.98]"
          >
            Apply Filters
          </button>
        </footer>
      </aside>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  statuses,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  statuses: Array<{ id: string; statusName: string; statusCode: string }>;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-slate-900 outline-none transition focus:border-[#1877F2] focus:ring-2 focus:ring-blue-500/15"
      >
        <option value="">All Statuses</option>
        {statuses.map((status) => (
          <option key={status.id} value={status.statusName}>
            {status.statusName}
          </option>
        ))}
      </select>
    </label>
  );
}

function Field({
  label,
  placeholder,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#1877F2] focus:ring-2 focus:ring-blue-500/15"
      />
    </label>
  );
}
