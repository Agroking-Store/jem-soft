"use client";

import { useRef } from "react";
import { Calendar as CalendarIcon } from "lucide-react";


const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// "2026-04-01" -> "01/Apr/2026"
const isoToDisplay = (iso: string) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${MONTHS[Number(m) - 1]}/${y}`;
};

// "01/Apr/2026" -> "2026-04-01"
const displayToIso = (display: string) => {
  const parts = display.split("/");
  if (parts.length !== 3) return "";
  const [d, mon, y] = parts;
  const m = MONTHS.findIndex((x) => x.toLowerCase() === mon.toLowerCase());
  if (m === -1) return "";
  return `${y}-${String(m + 1).padStart(2, "0")}-${d.padStart(2, "0")}`;
};

interface DateFieldProps {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  className?: string;
}

export default function DateField({ label, value, placeholder, onChange, className = "" }: DateFieldProps) {
  const pickerRef = useRef<HTMLInputElement>(null);

  return (
    <div className={`relative ${className}`}>
      <span className="absolute -top-2 left-3 z-10 bg-white px-1 leading-none text-[10px] text-[#1877F2] font-bold uppercase">
        {label}
      </span>

      <div className="relative flex items-center border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs bg-slate-50/40 focus-within:border-[#1877F2] focus-within:ring-2 focus-within:ring-blue-500/15 transition">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full text-xs font-semibold text-slate-900 focus:outline-none bg-transparent"
        />

        <button
          type="button"
          onClick={() => pickerRef.current?.showPicker()}
          className="shrink-0 text-[#1877F2] hover:text-blue-800 transition"
          title="Pick a date"
        >
          <CalendarIcon size={16} />
        </button>

        <input
          ref={pickerRef}
          type="date"
          value={displayToIso(value)}
          onChange={(e) => onChange(isoToDisplay(e.target.value))}
          className="pointer-events-none absolute right-2 bottom-0 h-0 w-0 opacity-0"
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}