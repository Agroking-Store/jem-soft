"use client";

import { format } from "date-fns";
import DatePicker from "@/app/(dashboard)/dashboard/lic/policies/new/DatePicker";
import { SearchableSelect } from "@/features/customers/components/CustomerUi";
import type { MedicalHistoryRecordItem } from "../medicalHistorySlice";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
      {label}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

function ReadOnlyField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <FieldLabel label={label} />
      <div className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 px-3 text-sm text-slate-600">
        {value || "—"}
      </div>
    </div>
  );
}

export interface MedicalHistoryInlineEditorProps {
  /** The single medical record being edited inline (or empty for create). */
  record: MedicalHistoryRecordItem;
  onChange: (record: MedicalHistoryRecordItem) => void;
  /** Read-only derived values from the member profile. */
  derivedAge?: number | null;
  derivedGender?: string | null;
  /** Optional error map (e.g. bloodGroup required). */
  errors?: Record<string, string>;
}

/**
 * Reusable inline editor for a single medical history record.
 * Mirrors the field set built in forms/MedicalHistoryForm.tsx but is
 * controlled from the parent (the Customer Master create/edit form) and
 * captures exactly ONE record (not a repeatable list).
 */
export default function MedicalHistoryInlineEditor({
  record,
  onChange,
  derivedAge,
  derivedGender,
  errors = {},
}: MedicalHistoryInlineEditorProps) {
  const set = <K extends keyof MedicalHistoryRecordItem>(key: K, value: MedicalHistoryRecordItem[K]) => {
    onChange({ ...record, [key]: value });
  };

  return (
    <div className="space-y-6">
      {/* Basic Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div>
          <FieldLabel label="Medical History Date" required />
          <DatePicker
            value={record.medicalHistoryDate ? new Date(record.medicalHistoryDate) : undefined}
            onChange={(date) => set("medicalHistoryDate", date ? format(date, "yyyy-MM-dd") : "")}
          />
          {errors.medicalHistoryDate && <p className="text-xs text-red-500 mt-1">{errors.medicalHistoryDate}</p>}
        </div>
        <ReadOnlyField label="Age (from DOB)" value={derivedAge != null ? String(derivedAge) : null} />
        <ReadOnlyField label="Gender" value={derivedGender} />
      </div>

      {/* Member's Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <SearchableSelect
          label="Blood Group"
          required
          placeholder="Select blood group"
          error={errors.bloodGroup}
          value={record.bloodGroup || ""}
          onChange={(val) => set("bloodGroup", val)}
          options={BLOOD_GROUPS.map((g) => ({ value: g, label: g }))}
        />
        <div>
          <FieldLabel label="Blood Pressure (mmHg)" />
          <input type="text" placeholder="e.g. 120/80" value={record.bloodPressure || ""} onChange={(e) => set("bloodPressure", e.target.value || null)} className="w-full border border-slate-200 rounded-lg py-2.5 px-3 text-sm text-slate-950 bg-white outline-none focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/15 transition-all" />
        </div>
        <div>
          <FieldLabel label="Pulse (bpm)" />
          <input type="text" placeholder="e.g. 72" value={record.pulse || ""} onChange={(e) => set("pulse", e.target.value || null)} className="w-full border border-slate-200 rounded-lg py-2.5 px-3 text-sm text-slate-950 bg-white outline-none focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/15 transition-all" />
        </div>
        <div>
          <FieldLabel label="Height (Cms)" />
          <input type="number" placeholder="e.g. 172" value={record.height != null ? String(record.height) : ""} onChange={(e) => set("height", e.target.value ? Number(e.target.value) : null)} className="w-full border border-slate-200 rounded-lg py-2.5 px-3 text-sm text-slate-950 bg-white outline-none focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/15 transition-all" />
        </div>
        <div>
          <FieldLabel label="Weight (Kgs)" />
          <input type="number" placeholder="e.g. 68" value={record.weight != null ? String(record.weight) : ""} onChange={(e) => set("weight", e.target.value ? Number(e.target.value) : null)} className="w-full border border-slate-200 rounded-lg py-2.5 px-3 text-sm text-slate-950 bg-white outline-none focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/15 transition-all" />
        </div>
        <div>
          <FieldLabel label="Chest (Cms)" />
          <input type="number" placeholder="e.g. 90" value={record.chest != null ? String(record.chest) : ""} onChange={(e) => set("chest", e.target.value ? Number(e.target.value) : null)} className="w-full border border-slate-200 rounded-lg py-2.5 px-3 text-sm text-slate-950 bg-white outline-none focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/15 transition-all" />
        </div>
        <div>
          <FieldLabel label="Abdomen (Cms)" />
          <input type="number" placeholder="e.g. 85" value={record.abdomen != null ? String(record.abdomen) : ""} onChange={(e) => set("abdomen", e.target.value ? Number(e.target.value) : null)} className="w-full border border-slate-200 rounded-lg py-2.5 px-3 text-sm text-slate-950 bg-white outline-none focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/15 transition-all" />
        </div>
        <div>
          <FieldLabel label="Identification Mark" />
          <input type="text" placeholder="e.g. Mole on left forearm" value={record.identificationMark || ""} onChange={(e) => set("identificationMark", e.target.value || null)} className="w-full border border-slate-200 rounded-lg py-2.5 px-3 text-sm text-slate-950 bg-white outline-none focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/15 transition-all" />
        </div>
        <div>
          <FieldLabel label="Spectacles Details" />
          <input type="text" placeholder="e.g. -2.5 power" value={record.spectaclesDetails || ""} onChange={(e) => set("spectaclesDetails", e.target.value || null)} className="w-full border border-slate-200 rounded-lg py-2.5 px-3 text-sm text-slate-950 bg-white outline-none focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/15 transition-all" />
        </div>
        <div className="md:col-span-3">
          <FieldLabel label="Dental Details" />
          <input type="text" placeholder="e.g. Upper molar crown" value={record.dentalDetails || ""} onChange={(e) => set("dentalDetails", e.target.value || null)} className="w-full border border-slate-200 rounded-lg py-2.5 px-3 text-sm text-slate-950 bg-white outline-none focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/15 transition-all" />
        </div>
      </div>

      {/* Examination Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="md:col-span-2">
          <FieldLabel label="Major Illness" />
          <textarea rows={2} placeholder="Any major illness history..." value={record.majorIllness || ""} onChange={(e) => set("majorIllness", e.target.value || null)} className="w-full border border-slate-200 rounded-lg py-2.5 px-3 text-sm text-slate-950 bg-white outline-none focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/15 transition-all resize-none" />
        </div>
        <div className="md:col-span-2">
          <FieldLabel label="Operation / Accident" />
          <textarea rows={2} placeholder="Any operation or accident history..." value={record.operationAccident || ""} onChange={(e) => set("operationAccident", e.target.value || null)} className="w-full border border-slate-200 rounded-lg py-2.5 px-3 text-sm text-slate-950 bg-white outline-none focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/15 transition-all resize-none" />
        </div>
        <div className="md:col-span-2">
          <FieldLabel label="Special Report" />
          <textarea rows={2} placeholder="Any special report..." value={record.specialReport || ""} onChange={(e) => set("specialReport", e.target.value || null)} className="w-full border border-slate-200 rounded-lg py-2.5 px-3 text-sm text-slate-950 bg-white outline-none focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/15 transition-all resize-none" />
        </div>
        <div>
          <FieldLabel label="Doctor Name" />
          <input type="text" placeholder="e.g. Dr. Sharma" value={record.doctorName || ""} onChange={(e) => set("doctorName", e.target.value || null)} className="w-full border border-slate-200 rounded-lg py-2.5 px-3 text-sm text-slate-950 bg-white outline-none focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/15 transition-all" />
        </div>
        <div>
          <FieldLabel label="Medical Examination Date" />
          <DatePicker
            value={record.medicalExaminationDate ? new Date(record.medicalExaminationDate) : undefined}
            onChange={(date) => set("medicalExaminationDate", date ? format(date, "yyyy-MM-dd") : "")}
          />
        </div>
      </div>
    </div>
  );
}