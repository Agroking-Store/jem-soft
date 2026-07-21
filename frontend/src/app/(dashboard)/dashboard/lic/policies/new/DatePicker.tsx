"use client";

import React from "react";
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

export default function DatePicker({
  value,
  onChange,
  placeholder = "YYYY-MM-DD",
  readOnly = false,
}: Props) {
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
        className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/20"
        calendarClassName="shadow-xl border rounded-lg"
      />
    </div>
  );
}
