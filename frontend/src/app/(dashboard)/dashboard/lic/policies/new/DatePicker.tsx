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
        onChange={(date) => onChange(date ?? undefined)}
        dateFormat="yyyy-MM-dd"
        placeholderText={placeholder}
        showMonthDropdown
        showYearDropdown
        dropdownMode="select"
        yearDropdownItemNumber={100}
        scrollableYearDropdown
        disabled={readOnly}
        className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
        calendarClassName="shadow-xl border rounded-lg"
      />
    </div>
  );
}