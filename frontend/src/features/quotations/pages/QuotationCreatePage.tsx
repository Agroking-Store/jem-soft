"use client";

import { useState } from "react";
import { useDispatch } from "react-redux";
import { ArrowLeft, Loader2 } from "lucide-react";
import { AppDispatch } from "@/store/store";
import { LifeGuardForm } from "@/features/quotations/components/LifeGuardForm";
import { ProtectAndEarnForm } from "@/features/quotations/components/ProtectAndEarnForm";
import { RetireEnjoyForm } from "@/features/quotations/components/RetireEnjoyForm";
import type { Quotation, QuotationProductType } from "@/features/quotations/types";

interface QuotationCreatePageProps {
  productType: QuotationProductType;
  onClose: () => void;
  onSaved: (quotation: Quotation) => void;
}

export default function QuotationCreatePage({
  productType,
  onClose,
  onSaved,
}: QuotationCreatePageProps) {
  const dispatch = useDispatch<AppDispatch>();
  const [isSaving, setIsSaving] = useState(false);

  const handleSaved = (quotation: Quotation, shouldViewReport: boolean) => {
    setIsSaving(true);
    onSaved(quotation);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-[#1877F2] cursor-pointer"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h3 className="text-base font-bold text-slate-900">
            New Quotation — {productType.replace(/_/g, " ")}
          </h3>
          <p className="text-xs text-slate-500">
            Fill in the details below to calculate and save the quotation.
          </p>
        </div>
      </div>

      {isSaving && (
        <div className="flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
          <Loader2 size={16} className="animate-spin" />
          Saving quotation...
        </div>
      )}

      {productType === "LIFE_GUARD" && (
        <LifeGuardForm onCancel={onClose} onSaved={handleSaved} />
      )}
      {productType === "PROTECT_AND_EARN" && (
        <ProtectAndEarnForm onCancel={onClose} onSaved={handleSaved} />
      )}
      {productType === "RETIRE_ENJOY_I" && (
        <RetireEnjoyForm onCancel={onClose} onSaved={handleSaved} />
      )}
    </div>
  );
}
