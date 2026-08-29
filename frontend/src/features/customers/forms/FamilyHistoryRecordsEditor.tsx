"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { format } from "date-fns";
import DatePicker from "@/app/(dashboard)/dashboard/lic/policies/new/DatePicker";
import { SearchableSelect, formatFamilyHistoryDate } from "@/features/customers/components/CustomerUi";
import type { FamilyHistoryRecordItem } from "../familyHistorySlice";

const RELATIONS = [
  "Self",
  "Father",
  "Mother",
  "Brother",
  "Sister",
  "Spouse",
  "Son",
  "Daughter",
  "Grandfather",
  "Grandmother",
  "Uncle",
  "Aunt",
];

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
      {label}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

function calculateCurrentAge(recordedAge: number, recordDate: string) {
  if (!recordDate) return recordedAge;
  try {
    const historyDate = new Date(recordDate);
    const today = new Date();
    const yearsDiff = today.getFullYear() - historyDate.getFullYear();
    const historyAnniversary = new Date(today.getFullYear(), historyDate.getMonth(), historyDate.getDate());
    const adjustedDiff = today >= historyAnniversary ? yearsDiff : yearsDiff - 1;
    return Math.max(recordedAge, recordedAge + Math.max(0, adjustedDiff));
  } catch {
    return recordedAge;
  }
}

export interface FamilyHistoryRecordsEditorProps {
  /** The family history date shared by all rows in this member's record. */
  familyHistoryDate: string;
  onFamilyHistoryDateChange: (date: string) => void;
  records: FamilyHistoryRecordItem[];
  onChange: (records: FamilyHistoryRecordItem[]) => void;
  /** Member's date of birth (yyyy-MM-dd). Used to auto-fill age for "Self". */
  dob?: string | null;
}

/** Calculate age in years from a yyyy-MM-dd date of birth. */
function calcAgeFromDob(dob?: string | null): number | null {
  if (!dob) return null;
  try {
    const birth = new Date(dob);
    if (isNaN(birth.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age >= 0 ? age : null;
  } catch {
    return null;
  }
}

/**
 * Reusable inline editor for a member's family history records.
 * Mirrors the row-based UI built in forms/FamilyHistoryForm.tsx but is
 * controlled from the parent (the Customer Master create/edit form) so the
 * same UI is not duplicated.
 */
export default function FamilyHistoryRecordsEditor({
  familyHistoryDate,
  onFamilyHistoryDateChange,
  records,
  onChange,
  dob,
}: FamilyHistoryRecordsEditorProps) {
  // Detail input state
  const [relation, setRelation] = useState("");
  const [age, setAge] = useState("");
  const [stateOfHealth, setStateOfHealth] = useState("");
  const [isDead, setIsDead] = useState(false);
  const [ageAtDeath, setAgeAtDeath] = useState("");
  const [causeOfDeath, setCauseOfDeath] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [detailErrors, setDetailErrors] = useState<Record<string, string>>({});

  // When the member's DOB changes and the current relation is "Self",
  // keep the age field auto-filled with the calculated age.
  useEffect(() => {
    if (relation === "Self") {
      const calculated = calcAgeFromDob(dob);
      if (calculated !== null) setAge(String(calculated));
    }
  }, [dob, relation]);

  const handleClearDetail = () => {
    setRelation("");
    setAge("");
    setStateOfHealth("");
    setIsDead(false);
    setAgeAtDeath("");
    setCauseOfDeath("");
    setEditingIndex(null);
    setDetailErrors({});
  };

  const handleAddDetail = () => {
    const errors: Record<string, string> = {};
    if (!relation) errors.relation = "Relation is required";
    if (!age) {
      errors.age = "Age is required";
    } else if (isNaN(Number(age)) || Number(age) <= 0) {
      errors.age = "Invalid age";
    }
    if (!stateOfHealth.trim()) errors.stateOfHealth = "State of health is required";
    if (isDead) {
      if (!ageAtDeath) {
        errors.ageAtDeath = "Age at death is required";
      } else if (isNaN(Number(ageAtDeath)) || Number(ageAtDeath) <= 0) {
        errors.ageAtDeath = "Invalid age at death";
      } else if (Number(ageAtDeath) < Number(age)) {
        errors.ageAtDeath = "Age at death cannot be less than age recorded";
      }
      if (!causeOfDeath.trim()) errors.causeOfDeath = "Cause of death is required";
    }
    if (Object.keys(errors).length > 0) {
      setDetailErrors(errors);
      return;
    }
    setDetailErrors({});

    const newRecord: FamilyHistoryRecordItem = {
      id: editingIndex !== null ? records[editingIndex]?.id : undefined,
      relation,
      age: Number(age),
      stateOfHealth: stateOfHealth.trim(),
      isDead,
      ageAtDeath: isDead ? Number(ageAtDeath) : null,
      causeOfDeath: isDead ? causeOfDeath.trim() : null,
    };

    if (editingIndex !== null) {
      const updated = [...records];
      updated[editingIndex] = newRecord;
      onChange(updated);
    } else {
      onChange([...records, newRecord]);
    }
    handleClearDetail();
  };

  const handleRemoveDetail = (index: number) => {
    onChange(records.filter((_, i) => i !== index));
    if (editingIndex === index) handleClearDetail();
  };

  return (
    <div className="space-y-5">
      {/* Family History Date */}
      <div className="max-w-xs">
        <FieldLabel label="Family History Date" required />
        <DatePicker
          value={familyHistoryDate ? new Date(familyHistoryDate) : undefined}
          onChange={(date) => onFamilyHistoryDateChange(date ? format(date, "yyyy-MM-dd") : "")}
        />
      </div>

      {/* Member's Details Subform */}
      <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-200/60">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex justify-between items-center">
          <span>Add Relative</span>
          {editingIndex !== null && (
            <span className="text-[10px] bg-blue-50 text-slate-800 px-2 py-0.5 rounded font-semibold normal-case">
              Editing Entry #{editingIndex + 1}
            </span>
          )}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SearchableSelect
            label="Relation"
            required
            placeholder="Select relation"
            searchPlaceholder="Search relations..."
            error={detailErrors.relation}
            value={relation}
            onChange={(val) => {
              setRelation(val);
              setDetailErrors((p) => ({ ...p, relation: "" }));
              // Auto-fill age from DOB when relation is "Self".
              if (val === "Self") {
                const calculated = calcAgeFromDob(dob);
                if (calculated !== null) setAge(String(calculated));
              }
            }}
            options={RELATIONS.map((r) => ({ value: r, label: r }))}
          />

          <div>
            <FieldLabel label="Age" required />
            <input
              type="number"
              placeholder="Current Age"
              value={age}
              onChange={(e) => {
                setAge(e.target.value);
                setDetailErrors((p) => ({ ...p, age: "" }));
              }}
              className={`w-full border rounded-lg py-2 px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-[#1877F2]
                ${detailErrors.age ? "border-red-300 bg-red-50/30" : "border-slate-200 bg-white hover:border-slate-300"}`}
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">Current Age</span>
            {detailErrors.age && <p className="text-xs text-red-500 mt-1">{detailErrors.age}</p>}
          </div>

          <div>
            <FieldLabel label="State of Health" required />
            <input
              type="text"
              placeholder="State of Health"
              value={stateOfHealth}
              onChange={(e) => {
                setStateOfHealth(e.target.value);
                setDetailErrors((p) => ({ ...p, stateOfHealth: "" }));
              }}
              className={`w-full border rounded-lg py-2 px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-[#1877F2]
                ${detailErrors.stateOfHealth ? "border-red-300 bg-red-50/30" : "border-slate-200 bg-white hover:border-slate-300"}`}
            />
            {detailErrors.stateOfHealth && (
              <p className="text-xs text-red-500 mt-1">{detailErrors.stateOfHealth}</p>
            )}
          </div>

          <div className="md:col-span-3 flex items-center gap-2 py-1">
            <input
              type="checkbox"
              id="fh-isDead"
              checked={isDead}
              onChange={(e) => {
                setIsDead(e.target.checked);
                setDetailErrors((p) => ({ ...p, ageAtDeath: "", causeOfDeath: "" }));
              }}
              className="w-4 h-4 text-[#1877F2] border-slate-300 rounded focus:ring-[#1877F2] cursor-pointer"
            />
            <label htmlFor="fh-isDead" className="text-xs font-semibold text-slate-600 uppercase cursor-pointer select-none">
              Is Dead
            </label>
          </div>

          {isDead && (
            <>
              <div>
                <FieldLabel label="Age at Death" required />
                <input
                  type="number"
                  placeholder="Age at Death"
                  value={ageAtDeath}
                  onChange={(e) => {
                    setAgeAtDeath(e.target.value);
                    setDetailErrors((p) => ({ ...p, ageAtDeath: "" }));
                  }}
                  className={`w-full border rounded-lg py-2 px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-[#1877F2]
                    ${detailErrors.ageAtDeath ? "border-red-300 bg-red-50/30" : "border-slate-200 bg-white hover:border-slate-300"}`}
                />
                {detailErrors.ageAtDeath && (
                  <p className="text-xs text-red-500 mt-1">{detailErrors.ageAtDeath}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <FieldLabel label="Cause of Death" required />
                <input
                  type="text"
                  placeholder="Cause of Death"
                  value={causeOfDeath}
                  onChange={(e) => {
                    setCauseOfDeath(e.target.value);
                    setDetailErrors((p) => ({ ...p, causeOfDeath: "" }));
                  }}
                  className={`w-full border rounded-lg py-2 px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-[#1877F2]
                    ${detailErrors.causeOfDeath ? "border-red-300 bg-red-50/30" : "border-slate-200 bg-white hover:border-slate-300"}`}
                />
                {detailErrors.causeOfDeath && (
                  <p className="text-xs text-red-500 mt-1">{detailErrors.causeOfDeath}</p>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200/50 mt-4 pt-3">
          <button
            onClick={handleClearDetail}
            type="button"
            className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-lg transition-colors cursor-pointer"
          >
            {editingIndex !== null ? "Cancel Edit" : "Clear Entry"}
          </button>
          <button
            onClick={handleAddDetail}
            type="button"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#5c67ff] to-[#3a47ff] hover:brightness-110 text-white rounded-xl font-semibold text-sm shadow-md shadow-blue-200 transition-all cursor-pointer"
          >
            <Plus size={15} />
            {editingIndex !== null ? "Update Entry" : "Add Entry"}
          </button>
        </div>
      </div>

      {/* Sub-table displaying added records */}
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider">
              <th className="py-2.5 px-4 text-left">Family History Date</th>
              <th className="py-2.5 px-4 text-left">Relation</th>
              <th className="py-2.5 px-4 text-left">Age</th>
              <th className="py-2.5 px-4 text-left">Current Age</th>
              <th className="py-2.5 px-4 text-left">State of Health</th>
              <th className="py-2.5 px-4 text-left">Age at Death</th>
              <th className="py-2.5 px-4 text-left">Cause of Death</th>
              <th className="py-2.5 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {records.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400 font-medium bg-white">
                  No Family History Records added yet.
                </td>
              </tr>
            ) : (
              records.map((r, index) => {
                const isCurrentlyEditing = editingIndex === index;
                return (
                  <tr
                    key={index}
                    onClick={() => {
                      setEditingIndex(index);
                      setRelation(r.relation);
                      setAge(r.age.toString());
                      setStateOfHealth(r.stateOfHealth);
                      setIsDead(r.isDead);
                      setAgeAtDeath(r.ageAtDeath ? r.ageAtDeath.toString() : "");
                      setCauseOfDeath(r.causeOfDeath || "");
                      setDetailErrors({});
                    }}
                    className={`transition-colors cursor-pointer ${
                      isCurrentlyEditing
                        ? "bg-[#1877F2]/15 hover:bg-[#1877F2]/10 font-semibold"
                        : "hover:bg-slate-50/40"
                    }`}
                    title="Click to edit this entry"
                  >
                    <td className="py-2.5 px-4 text-slate-600">
                      {formatFamilyHistoryDate(familyHistoryDate)}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-800">
                      {r.relation}
                      {isCurrentlyEditing && (
                        <span className="ml-2 text-[10px] bg-blue-50 text-slate-800 px-1.5 py-0.5 rounded font-bold uppercase">
                          Editing
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-slate-700">{r.age}</td>
                    <td className="py-2.5 px-4 text-slate-700">
                      {r.isDead ? "—" : calculateCurrentAge(r.age, familyHistoryDate)}
                    </td>
                    <td className="py-2.5 px-4 text-slate-700">{r.stateOfHealth}</td>
                    <td className="py-2.5 px-4 text-slate-600">{r.isDead ? r.ageAtDeath : "—"}</td>
                    <td className="py-2.5 px-4 text-slate-600">{r.isDead ? r.causeOfDeath : "—"}</td>
                    <td className="py-2.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleRemoveDetail(index)}
                        type="button"
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                        title="Remove item"
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