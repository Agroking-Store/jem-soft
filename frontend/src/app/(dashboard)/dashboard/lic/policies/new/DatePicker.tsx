"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import ReactDatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Calendar } from "lucide-react";
import { format } from "date-fns";

interface Props {
  value?: Date;
  onChange: (date?: Date) => void;
  placeholder?: string;
  readOnly?: boolean;
}

const POPPER_Z_INDEX_STYLE_ID = "datepicker-popper-zindex-override";

function ensurePopperZIndexStyle() {
  if (typeof document === "undefined") return;
  if (document.getElementById(POPPER_Z_INDEX_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = POPPER_Z_INDEX_STYLE_ID;
  style.textContent = `
    .react-datepicker-popper { z-index: 2147483647 !important; }
    /* "Today" and "Selected" should look identical — same navy fill */
    .react-datepicker__day--today,
    .react-datepicker__day--selected,
    .react-datepicker__day--keyboard-selected {
      background-color: #0B1220 !important;
      color: #fff !important;
      font-weight: 600 !important;
      border-radius: 0.375rem !important;
    }
    .react-datepicker__day--today:hover,
    .react-datepicker__day--selected:hover,
    .react-datepicker__day--keyboard-selected:hover {
      background-color: #16294D !important;
    }
  `;
  document.head.appendChild(style);
}

export default function DatePicker({
  value,
  onChange,
  placeholder = "YYYY-MM-DD",
  readOnly = false,
}: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    ensurePopperZIndexStyle();
  }, []);

  const PopperContainer = ({ children }: { children?: React.ReactNode }) => {
    if (typeof document === "undefined") {
      return null;
    }
    
    return createPortal(
      <div className="z-[1000]">{children}</div>,
      document.body,
    );
  };

  if (!mounted) {
    return (
      <div className="relative">
        <Calendar
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10 pointer-events-none"
        />

        <input
          type="text"
          readOnly
          value={value ? format(value, "yyyy-MM-dd") : ""}
          placeholder={placeholder}
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/20"
        />
      </div>
    );
  }

  return (
    <div className="relative">
      <Calendar
        size={16}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10 pointer-events-none"
      />

      <ReactDatePicker
        selected={value}
        onChange={(date: Date | null) => onChange(date ?? undefined)}
        dateFormat="yyyy-MM-dd"
        placeholderText={placeholder}
        showMonthDropdown
        showYearDropdown
        dropdownMode="select"
        yearDropdownItemNumber={100}
        scrollableYearDropdown
        disabled={readOnly}
        popperPlacement="bottom-start"
        popperContainer={PopperContainer}
        className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/20"
        calendarClassName="shadow-xl border rounded-lg"
      />
    </div>
  );
}