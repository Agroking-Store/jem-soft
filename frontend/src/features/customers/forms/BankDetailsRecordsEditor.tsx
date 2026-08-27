"use client";

import { useState } from "react";
import { Plus, Star, X } from "lucide-react";
import { SearchableSelect } from "@/features/customers/components/CustomerUi";
import type { CustomerBankDetail } from "../types";

const ACCOUNT_TYPES = [
  "Saving",
  "Current",
  "Overdraft",
  "Cash Credit",
  "Salary",
  "NRE",
  "NRO",
  "Other",
];

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
      {label}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

export interface BankDetailsRecordsEditorProps {
  bankDetails: CustomerBankDetail[];
  onChange: (bankDetails: CustomerBankDetail[]) => void;
}

export default function BankDetailsRecordsEditor({
  bankDetails,
  onChange,
}: BankDetailsRecordsEditorProps) {
  const [isDefault, setIsDefault] = useState(bankDetails.length === 0);
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountType, setAccountType] = useState("Saving");
  const [ifscCode, setIfscCode] = useState("");
  const [bankBranch, setBankBranch] = useState("");
  const [city, setCity] = useState("");
  const [micrNumber, setMicrNumber] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleClear = () => {
    setIsDefault(bankDetails.length === 0);
    setBankName("");
    setAccountNumber("");
    setAccountType("Saving");
    setIfscCode("");
    setBankBranch("");
    setCity("");
    setMicrNumber("");
    setEditingIndex(null);
    setErrors({});
  };

  const handleAddOrUpdate = () => {
    const errs: Record<string, string> = {};
    if (!bankName.trim() && !accountNumber.trim() && !ifscCode.trim()) {
      errs.bankName = "Please enter Bank Name or Account Number";
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});

    const newDetail: CustomerBankDetail = {
      id: editingIndex !== null ? bankDetails[editingIndex]?.id : undefined,
      isDefault: isDefault || bankDetails.length === 0,
      bankName: bankName.trim() || null,
      accountNumber: accountNumber.trim() || null,
      accountType: accountType || null,
      ifscCode: ifscCode.trim().toUpperCase() || null,
      bankBranch: bankBranch.trim() || null,
      city: city.trim() || null,
      micrNumber: micrNumber.trim() || null,
    };

    let updated = [...bankDetails];
    if (editingIndex !== null) {
      updated[editingIndex] = newDetail;
    } else {
      updated.push(newDetail);
    }

    // If new/updated account is marked as default, ensure all others are false
    if (newDetail.isDefault) {
      const activeIdx = editingIndex !== null ? editingIndex : updated.length - 1;
      updated = updated.map((b, idx) => ({
        ...b,
        isDefault: idx === activeIdx,
      }));
    } else {
      // If none is default, ensure the first is default
      if (!updated.some((b) => b.isDefault) && updated.length > 0) {
        updated[0].isDefault = true;
      }
    }

    onChange(updated);
    handleClear();
  };

  const handleRemove = (index: number) => {
    let updated = bankDetails.filter((_, i) => i !== index);
    if (updated.length > 0 && !updated.some((b) => b.isDefault)) {
      updated[0].isDefault = true;
    }
    onChange(updated);
    if (editingIndex === index) handleClear();
  };

  const handleToggleDefault = (index: number) => {
    const updated = bankDetails.map((b, idx) => ({
      ...b,
      isDefault: idx === index,
    }));
    onChange(updated);
  };

  return (
    <div className="space-y-5">
      {/* Bank Details Subform */}
      <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-200/60">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex justify-between items-center">
          <span>{editingIndex !== null ? "Edit Bank Account" : "Add Bank Account"}</span>
          {editingIndex !== null && (
            <span className="text-[10px] bg-[#E8C77A]/20 text-[#0B1220] px-2 py-0.5 rounded font-semibold normal-case">
              Editing Entry #{editingIndex + 1}
            </span>
          )}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <FieldLabel label="Bank Name" />
            <input
              type="text"
              placeholder="e.g. State Bank of India"
              value={bankName}
              onChange={(e) => {
                setBankName(e.target.value);
                setErrors((p) => ({ ...p, bankName: "" }));
              }}
              className={`w-full border rounded-lg py-2 px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#B8873A]/20 focus:border-[#B8873A]
                ${errors.bankName ? "border-red-300 bg-red-50/30" : "border-slate-200 bg-white hover:border-slate-300"}`}
            />
            {errors.bankName && <p className="text-xs text-red-500 mt-1">{errors.bankName}</p>}
          </div>

          <div>
            <FieldLabel label="Account Number" />
            <input
              type="text"
              placeholder="e.g. 123456789012"
              value={accountNumber}
              onChange={(e) => {
                setAccountNumber(e.target.value);
                setErrors((p) => ({ ...p, bankName: "" }));
              }}
              className="w-full border border-slate-200 bg-white hover:border-slate-300 rounded-lg py-2 px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#B8873A]/20 focus:border-[#B8873A]"
            />
          </div>

          <SearchableSelect
            label="Account Type"
            placeholder="Select Account Type"
            searchPlaceholder="Search account types..."
            value={accountType}
            onChange={(val) => setAccountType(val)}
            options={ACCOUNT_TYPES.map((t) => ({ value: t, label: t }))}
          />

          <div>
            <FieldLabel label="IFSC Code" />
            <input
              type="text"
              placeholder="e.g. SBIN0001234"
              value={ifscCode}
              onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
              className="w-full border border-slate-200 bg-white hover:border-slate-300 rounded-lg py-2 px-3 text-sm text-slate-900 uppercase placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#B8873A]/20 focus:border-[#B8873A]"
            />
          </div>

          <div>
            <FieldLabel label="Branch Name" />
            <input
              type="text"
              placeholder="e.g. Connaught Place"
              value={bankBranch}
              onChange={(e) => setBankBranch(e.target.value)}
              className="w-full border border-slate-200 bg-white hover:border-slate-300 rounded-lg py-2 px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#B8873A]/20 focus:border-[#B8873A]"
            />
          </div>

          <div>
            <FieldLabel label="City" />
            <input
              type="text"
              placeholder="e.g. New Delhi"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full border border-slate-200 bg-white hover:border-slate-300 rounded-lg py-2 px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#B8873A]/20 focus:border-[#B8873A]"
            />
          </div>

          <div>
            <FieldLabel label="MICR Number" />
            <input
              type="text"
              placeholder="e.g. 110002001"
              value={micrNumber}
              onChange={(e) => setMicrNumber(e.target.value)}
              className="w-full border border-slate-200 bg-white hover:border-slate-300 rounded-lg py-2 px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#B8873A]/20 focus:border-[#B8873A]"
            />
          </div>

          <div className="flex items-center gap-2 pt-6">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 uppercase cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="w-4 h-4 text-[#B8873A] border-slate-300 rounded focus:ring-[#B8873A] cursor-pointer"
              />
              Primary / Default Account
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200/50 mt-4 pt-3">
          <button
            onClick={handleClear}
            type="button"
            className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-lg transition-colors cursor-pointer"
          >
            {editingIndex !== null ? "Cancel Edit" : "Clear Entry"}
          </button>
          <button
            onClick={handleAddOrUpdate}
            type="button"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0B1220] hover:bg-[#16294D] text-white rounded-lg font-semibold text-sm shadow-sm transition-all duration-200 cursor-pointer"
          >
            <Plus size={15} />
            {editingIndex !== null ? "Update Account" : "Add Account"}
          </button>
        </div>
      </div>

      {/* Sub-table displaying added bank accounts */}
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider">
              <th className="py-2.5 px-4 text-center w-28">Default</th>
              <th className="py-2.5 px-4 text-left">Bank Name</th>
              <th className="py-2.5 px-4 text-left">Account Number</th>
              <th className="py-2.5 px-4 text-left">A/C Type</th>
              <th className="py-2.5 px-4 text-left">Branch / City</th>
              <th className="py-2.5 px-4 text-left">IFSC Code</th>
              <th className="py-2.5 px-4 text-left">MICR No.</th>
              <th className="py-2.5 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {bankDetails.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400 font-medium bg-white">
                  No bank accounts added yet.
                </td>
              </tr>
            ) : (
              bankDetails.map((b, index) => {
                const isCurrentlyEditing = editingIndex === index;
                return (
                  <tr
                    key={index}
                    onClick={() => {
                      setEditingIndex(index);
                      setIsDefault(b.isDefault ?? false);
                      setBankName(b.bankName || "");
                      setAccountNumber(b.accountNumber || "");
                      setAccountType(b.accountType || "Saving");
                      setIfscCode(b.ifscCode || "");
                      setBankBranch(b.bankBranch || "");
                      setCity(b.city || "");
                      setMicrNumber(b.micrNumber || "");
                      setErrors({});
                    }}
                    className={`transition-colors cursor-pointer ${
                      isCurrentlyEditing
                        ? "bg-[#B8873A]/15 hover:bg-[#B8873A]/10 font-semibold"
                        : "hover:bg-slate-50/40"
                    }`}
                    title="Click to edit this entry"
                  >
                    <td
                      className="py-2.5 px-4 text-center"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleDefault(index);
                      }}
                    >
                      {b.isDefault ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          <Star size={10} className="fill-emerald-800 text-emerald-800" /> Default
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="text-slate-400 hover:text-slate-700 text-xs transition-colors"
                          title="Click to make default"
                        >
                          Set default
                        </button>
                      )}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-800">
                      {b.bankName || "—"}
                      {isCurrentlyEditing && (
                        <span className="ml-2 text-[10px] bg-[#E8C77A]/20 text-[#0B1220] px-1.5 py-0.5 rounded font-bold uppercase">
                          Editing
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-700">{b.accountNumber || "—"}</td>
                    <td className="py-2.5 px-4 text-slate-700">{b.accountType || "—"}</td>
                    <td className="py-2.5 px-4 text-slate-600">
                      {[b.bankBranch, b.city].filter(Boolean).join(", ") || "—"}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-xs text-slate-700">{b.ifscCode || "—"}</td>
                    <td className="py-2.5 px-4 font-mono text-xs text-slate-600">{b.micrNumber || "—"}</td>
                    <td className="py-2.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleRemove(index)}
                        type="button"
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                        title="Remove bank account"
                      >
                        <X size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
