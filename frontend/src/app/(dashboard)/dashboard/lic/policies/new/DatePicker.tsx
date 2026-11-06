"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import ReactDatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Calendar } from "lucide-react";
import { format, isValid } from "date-fns";

interface Props {
  value?: Date | string | null;
  onChange: (date?: Date) => void;
  placeholder?: string;
  readOnly?: boolean;
  /** Inclusive lower bound, "YYYY-MM-DD". Days before it are greyed out. */
  minDate?: string;
  /** Inclusive upper bound, "YYYY-MM-DD". Days after it are greyed out. */
  maxDate?: string;
}

const POPPER_Z_INDEX_STYLE_ID = "datepicker-popper-zindex-override";

function ensurePopperZIndexStyle() {
  if (typeof document === "undefined") return;
  if (document.getElementById(POPPER_Z_INDEX_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = POPPER_Z_INDEX_STYLE_ID;
  style.textContent = `
    #datepicker-portal {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      z-index: 2147483647 !important;
      pointer-events: none;
    }
    #datepicker-portal .react-datepicker-popper {
      pointer-events: auto;
      z-index: 2147483647 !important;
    }
    .react-datepicker-popper { z-index: 2147483647 !important; }
    .react-datepicker-wrapper { width: 100% !important; display: block !important; }
    .react-datepicker__input-container { width: 100% !important; }
    .react-datepicker__day--today,
    .react-datepicker__day--selected,
    .react-datepicker__day--keyboard-selected {
      background-color: #1877F2 !important;
      color: #fff !important;
      font-weight: 600 !important;
      border-radius: 0.375rem !important;
    }
  `;
  document.head.appendChild(style);
}

export default function DatePicker({
  value,
  onChange,
  placeholder = "YYYY-MM-DD",
  readOnly = false,
  minDate,
  maxDate,
}: Props) {
  const [mounted, setMounted] = useState(false);

  // Parse "YYYY-MM-DD" as a *local* midnight date. `new Date("2016-01-04")`
  // is UTC and lands on the previous day in negative-offset timezones.
  const minDay = useMemo(() => {
    if (!minDate) return undefined;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(minDate.trim());
    return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : undefined;
  }, [minDate]);
  const maxDay = useMemo(() => {
    if (!maxDate) return undefined;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(maxDate.trim());
    return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : undefined;
  }, [maxDate]);

  useEffect(() => {
    setMounted(true);
    ensurePopperZIndexStyle();
  }, []);

  const timestamp = useMemo(() => {
    if (!value) return null;
    if (value instanceof Date) {
      return isValid(value) ? value.getTime() : null;
    }
    const d = new Date(value);
    return isValid(d) ? d.getTime() : null;
  }, [value instanceof Date ? value.getTime() : value]);

  const selectedDate = useMemo(() => {
    return timestamp !== null ? new Date(timestamp) : null;
  }, [timestamp]);

  const handleDateChange = useCallback(
    (date: Date | null) => {
      const newDate = date ?? undefined;
      const newTime = newDate && isValid(newDate) ? newDate.getTime() : undefined;

      if (newTime !== (timestamp ?? undefined)) {
        onChange(newDate);
      }
    },
    [onChange, timestamp],
  );

  if (!mounted) {
    return (
      <div className="relative w-full">
        <Calendar
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10 pointer-events-none"
        />
        <input
          type="text"
          readOnly
          value={selectedDate ? format(selectedDate, "yyyy-MM-dd") : ""}
          placeholder={placeholder}
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-900 outline-none"
        />
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <Calendar
        size={16}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10 pointer-events-none"
      />

      <ReactDatePicker
        selected={selectedDate}
        onChange={handleDateChange}
        minDate={minDay}
        maxDate={maxDay}
        dateFormat="yyyy-MM-dd"
        placeholderText={placeholder}
        showMonthDropdown
        showYearDropdown
        dropdownMode="select"
        yearDropdownItemNumber={100}
        scrollableYearDropdown
        disabled={readOnly}
        portalId="datepicker-portal"
        popperPlacement="bottom-start"
        className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-[#1877F2] focus:ring-2 focus:ring-blue-500/20"
        calendarClassName="shadow-xl border rounded-lg"
      />
    </div>
  );
}