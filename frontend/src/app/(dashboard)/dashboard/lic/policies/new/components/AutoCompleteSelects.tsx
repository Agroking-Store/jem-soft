import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { Search, X } from "lucide-react";
import { useNotificationStore } from "@/store/notificationStore";

export function getFullName(customer: {
  salutation?: string | null;
  firstName: string;
  middleName?: string | null;
  lastName?: string | null;
}) {
  return [
    customer.salutation,
    customer.firstName,
    customer.middleName,
    customer.lastName,
  ]
    .filter(Boolean)
    .join(" ");
}

// A reusable component for selecting a customer group with search functionality.
export const GroupAutoComplete = ({
  value,
  onChange,
  groups,
}: {
  value: string;
  onChange: (id: string) => void;
  groups: {
    id: string;
    groupCode?: string | null;
    groupName?: string | null;
  }[];
}) => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = groups.find((g) => g.id === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = groups
    .filter((g) => {
      const q = query.toLowerCase();
      return (
        g.groupName?.toLowerCase().includes(q) ||
        g.groupCode?.toLowerCase().includes(q)
      );
    })
    .slice(0, 10);

  const { fetchNotifications } = useNotificationStore();

  return (
    <div ref={ref} className="relative">
      <label className="block text-sm font-medium text-slate-700 mb-1">
        Group Name <span className="text-red-500">*</span>
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
          <Search size={16} />
        </span>
        <input
          value={
            selected
              ? `${selected.groupCode ? `[${selected.groupCode}] ` : ""}${selected.groupName || ""}`
              : query
          }
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (!e.target.value) onChange("");
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search group by name or code..."
          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B8873A]/20 focus:border-[#B8873A] text-sm pl-9"
        />
        {selected && (
          <button
            type="button"
            onClick={() => {
              onChange(""); // Clear the value
              setQuery("");
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X size={13} />
          </button>
        )}
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-52 overflow-y-auto">
          {filtered.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => {
                onChange(g.id);
                setQuery("");
                setOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#B8873A]/10 transition-colors text-left"
            >
              <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                {g.groupCode || "—"}
              </span>
              <span className="text-sm font-medium text-slate-800">
                {g.groupName || "—"}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const AdvisorAutoComplete = ({
  value,
  onChange,
  advisors,
  disabled,
  placeholder,
}: {
  value: string;
  onChange: (id: string) => void;
  advisors: { id: string; advisorCode: string; advisorName: string }[];
  disabled?: boolean;
  placeholder?: string;
}) => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = advisors.find((a) => a.id === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = advisors
    .filter((a) => {
      const q = query.toLowerCase();
      return (
        a.advisorName.toLowerCase().includes(q) ||
        a.advisorCode.toLowerCase().includes(q)
      );
    })
    .slice(0, 10);

  return (
    <div ref={ref} className="relative w-full">
      <label className="block text-sm font-medium text-slate-700 mb-1">
        Advisor <span className="text-red-500">*</span>
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
          <Search size={16} />
        </span>
        <input
          value={
            selected
              ? `[${selected.advisorCode}] ${selected.advisorName}`
              : query
          }
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (!e.target.value) onChange("");
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder || "Search advisor by name or code..."}
          disabled={disabled}
          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B8873A]/20 focus:border-[#B8873A] text-sm pl-9 disabled:bg-slate-50 disabled:cursor-not-allowed"
        />
        {selected && (
          <button
            type="button"
            onClick={() => {
              onChange("");
              setQuery("");
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X size={13} />
          </button>
        )}
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-52 overflow-y-auto">
          {filtered.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => {
                onChange(a.id);
                setQuery("");
                setOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#B8873A]/10 transition-colors text-left"
            >
              <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                {a.advisorCode}
              </span>
              <span className="text-sm font-medium text-slate-800">
                {a.advisorName}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const LifeAssuredAutoComplete = ({
  value,
  onChange,
  members,
  disabled,
  placeholder,
  label,
  required,
  error,
}: {
  value: string;
  onChange: (id: string) => void;
  members: {
    id: string;
    firstName: string;
    middleName?: string | null;
    lastName?: string | null;
    salutation?: string | null;
  }[];
  disabled?: boolean;
  placeholder?: string;
  label: string;
  required?: boolean;
  error?: string;
}) => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const selected = members.find((m) => m.id === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const isInside =
        (triggerRef.current && triggerRef.current.contains(target)) ||
        (panelRef.current && panelRef.current.contains(target));
      if (!isInside) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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

  const filtered = members
    .filter((m) => {
      const q = query.toLowerCase();
      return getFullName(m).toLowerCase().includes(q);
    })
    .slice(0, 10);

  return (
    <div ref={triggerRef} className="relative">
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
          <Search size={16} />
        </span>
        <input
          value={selected ? getFullName(selected) : query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (!e.target.value) onChange("");
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full px-3 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B8873A]/20 focus:border-[#B8873A] text-sm pl-9 disabled:bg-slate-50 disabled:cursor-not-allowed ${error ? "border-red-500" : "border-slate-200"
            }`}
        />
        {selected && (
          <button
            type="button"
            onClick={() => {
              onChange("");
              setQuery("");
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X size={14} />
          </button>
        )}
      </div>
      {open &&
        createPortal(
          <div
            ref={panelRef}
            style={pos}
            className="absolute z-[1000] mt-1.5 w-full min-w-[220px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.14)]"
          >
            <div className="max-h-60 overflow-y-auto py-1">
              {filtered.length > 0 ? (
                filtered.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      onChange(m.id);
                      setQuery("");
                      setOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#B8873A]/10 transition-colors text-left"
                  >
                    <span className="text-sm font-medium text-slate-800">
                      {getFullName(m)}
                    </span>
                  </button>
                ))
              ) : (
                <p className="px-3 py-4 text-center text-sm text-slate-400">
                  No results found
                </p>
              )}
            </div>
          </div>,
          document.body,
        )}
      {error && (
        <p className="text-xs text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
};

export const BranchAutoComplete = ({
  value,
  onChange,
  branches,
  disabled,
  placeholder,
}: {
  value: string;
  onChange: (id: string) => void;
  branches: { id: string; branchCode: string; branchName: string }[];
  disabled?: boolean;
  placeholder?: string;
}) => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = branches.find((b) => b.id === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <label className="block text-sm font-medium text-slate-700 mb-1">
        Branch
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
          <Search size={16} />
        </span>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          disabled={disabled}
          className="w-full text-left px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B8873A]/20 focus:border-[#B8873A] text-sm pl-9 disabled:bg-slate-50 disabled:cursor-not-allowed"
          aria-label={
            selected
              ? `[${selected.branchCode}] ${selected.branchName}`
              : placeholder || "Select a branch..."
          }
        >
          {selected
            ? `[${selected.branchCode}] ${selected.branchName}`
            : placeholder || "Select a branch..."}
        </button>
        {selected && (
          <button
            type="button"
            onClick={() => {
              onChange("");
              setQuery("");
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X size={14} />
          </button>
        )}
      </div>
      {open &&
        branches.length > 0 && ( // This should use the DropdownPanel component for consistency
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-52 overflow-y-auto">
            {branches.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => {
                  onChange(b.id);
                  setQuery("");
                  setOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#B8873A]/10 transition-colors text-left"
              >
                <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                  {b.branchCode}
                </span>
                <span className="text-sm font-medium text-slate-800">
                  {b.branchName}
                </span>
              </button>
            ))}
          </div>
        )}
    </div>
  );
};
