"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";

export type CustomerModalEntry =
  | { key: string; type: "group-create" }
  | { key: string; type: "group-details"; id: string }
  | { key: string; type: "group-edit"; id: string }
  | { key: string; type: "master-create"; groupId?: string }
  | { key: string; type: "master-details"; id: string }
  | { key: string; type: "master-edit"; id: string }
  | { key: string; type: "family-create"; memberId?: string; groupId?: string }
  | { key: string; type: "family-details"; id: string }
  | { key: string; type: "family-edit"; id: string }
  | { key: string; type: "medical-create"; memberId: string }
  | { key: string; type: "medical-edit"; id: string; memberId: string };

export function getCustomerModalTitle(entry: CustomerModalEntry) {
  switch (entry.type) {
    case "group-create":
      return "Add Customer Group";
    case "group-details":
      return "Customer Group Details";
    case "group-edit":
      return "Edit Customer Group";
    case "master-create":
      return "Add Customer";
    case "master-details":
      return "Customer Details";
    case "master-edit":
      return "Edit Customer";
    case "family-create":
      return "Add Family History";
    case "family-details":
      return "Family History Details";
    case "family-edit":
      return "Edit Family History";
    case "medical-create":
      return "Add Medical History";
    case "medical-edit":
      return "Edit Medical History";
  }
}

export function CustomerModalShell({
  entry,
  depth,
  isTop,
  children,
  onClose,
}: {
  entry: CustomerModalEntry;
  depth: number;
  isTop: boolean;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      aria-hidden={!isTop}
      className="fixed inset-0 flex items-center justify-center px-3 py-4 sm:px-5 sm:py-6"
      style={{ zIndex: 60 + depth * 10 }}
    >
      <button
        type="button"
        aria-label="Close modal"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-[#0B1220]/55 backdrop-blur-sm"
      />
      <section
        role="dialog"
        aria-modal={isTop}
        aria-label={getCustomerModalTitle(entry)}
        className={`relative flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.34)] transition-all duration-200 ${
          isTop ? "scale-100 opacity-100" : "scale-[0.985] opacity-80"
        }`}
      >
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#B8873A]/40 to-transparent" />
        <header className="flex items-center justify-between gap-4 border-b border-slate-200 bg-gradient-to-r from-[#0B1220] via-[#132342] to-[#16294D] px-5 py-4">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#E8C77A]">
              Customer Module
            </p>
            <h2 className="mt-1 truncate font-serif text-lg font-semibold text-white">
              {getCustomerModalTitle(entry)}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white transition-colors hover:bg-white/15"
            title="Close"
          >
            <X size={18} />
          </button>
        </header>
        <div className="overflow-y-auto bg-slate-50/40 px-4 py-5 sm:px-6">
          {children}
        </div>
      </section>
    </div>
  );
}
