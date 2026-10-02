"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import type { QuotationProductType } from "../types";

export type QuotationModalEntry =
  | { key: string; type: "create"; productType: QuotationProductType }
  | { key: string; type: "details"; id: string }
  | { key: string; type: "report"; id: string };

export function getQuotationModalTitle(entry: QuotationModalEntry) {
  switch (entry.type) {
    case "create":
      return "Add Quotation";
    case "details":
      return "Quotation Details";
    case "report":
      return "Quotation Report";
  }
}

export function QuotationModalShell({
  entry,
  depth,
  isTop,
  children,
  onClose,
}: {
  entry: QuotationModalEntry;
  depth: number;
  isTop: boolean;
  children: ReactNode;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const modal = (
    <div
      aria-hidden={!isTop}
      className="fixed inset-0 flex items-center justify-center px-3 py-4 sm:px-5 sm:py-6"
      style={{ zIndex: 60 + depth * 10 }}
    >
      <button
        type="button"
        aria-label="Close modal"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-slate-950/50 backdrop-blur-sm"
      />
      <section
        role="dialog"
        aria-modal={isTop}
        aria-label={getQuotationModalTitle(entry)}
        className={`relative flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all duration-200 ${
          isTop ? "scale-100 opacity-100" : "scale-[0.985] opacity-80"
        }`}
      >
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#1877F2] via-[#1877F2]/40 to-transparent" />
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-blue-900/30 bg-gradient-to-r from-[#1e3a8a] via-[#1e40af] to-[#2563eb] px-5 py-4">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#93c5fd]">
              Quotation Module
            </p>
            <h2 className="mt-0.5 truncate text-lg font-bold text-white">
              {getQuotationModalTitle(entry)}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white transition-colors hover:bg-white/20 cursor-pointer"
            title="Close"
          >
            <X size={18} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto bg-[#f8faff] px-4 py-5 sm:px-6">
          {children}
        </div>
      </section>
    </div>
  );

  if (!mounted) return null;
  return createPortal(modal, document.body);
}
