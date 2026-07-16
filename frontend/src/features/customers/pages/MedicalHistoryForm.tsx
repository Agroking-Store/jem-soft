"use client";

import React, { useEffect, useState } from "react";
import { ArrowLeft, ChevronRight, Save, RotateCcw, Activity } from "lucide-react";
import { format } from "date-fns";
import DatePicker from "@/app/(dashboard)/dashboard/lic/policies/new/DatePicker";
import toast from "react-hot-toast";
import { SearchableSelect } from "@/features/customers/components/CustomerUi";

interface MedicalHistoryFormProps {
  recordId?: string;
  memberId: string;
  onClose: () => void;
}

export interface MedicalHistoryRecord {
  id: string;
  memberId: string;
  date: string;
  condition: string;
  ageOfOnset: number;
  treatment: string;
  status: "Active" | "Controlled" | "Cured";
  notes?: string;
}

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
      {label}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="relative mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
      <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#B8873A]/40 to-transparent" />
      <div className="flex items-center gap-2.5 border-b border-slate-200 bg-slate-50 px-5 py-3.5">
        <span className="text-[#B8873A]">{icon}</span>
        <h2 className="font-serif text-sm font-bold uppercase tracking-wider text-[#0B1220]">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export default function MedicalHistoryForm({ recordId, memberId, onClose }: MedicalHistoryFormProps) {
  const isEditMode = !!recordId;

  // Form states
  const [condition, setCondition] = useState("");
  const [medicalDate, setMedicalDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [ageOfOnset, setAgeOfOnset] = useState("");
  const [treatment, setTreatment] = useState("");
  const [status, setStatus] = useState<"Active" | "Controlled" | "Cured">("Active");
  const [notes, setNotes] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load record details from localStorage if editing
  useEffect(() => {
    if (isEditMode && recordId) {
      const recordsKey = `medical_history_${memberId}`;
      const existingRecords: MedicalHistoryRecord[] = JSON.parse(localStorage.getItem(recordsKey) ?? "[]");
      const record = existingRecords.find((r) => r.id === recordId);
      if (record) {
        setCondition(record.condition);
        setMedicalDate(record.date.substring(0, 10));
        setAgeOfOnset(String(record.ageOfOnset));
        setTreatment(record.treatment || "");
        setStatus(record.status);
        setNotes(record.notes || "");
      }
    }
  }, [isEditMode, recordId, memberId]);

  const handleReset = () => {
    setCondition("");
    setMedicalDate(new Date().toISOString().substring(0, 10));
    setAgeOfOnset("");
    setTreatment("");
    setStatus("Active");
    setNotes("");
    setErrors({});
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!condition.trim()) newErrors.condition = "Condition/Disease is required";
    if (!medicalDate) newErrors.medicalDate = "Record date is required";
    if (!ageOfOnset) {
      newErrors.ageOfOnset = "Age of onset is required";
    } else if (isNaN(Number(ageOfOnset)) || Number(ageOfOnset) < 0) {
      newErrors.ageOfOnset = "Please enter a valid age";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const recordsKey = `medical_history_${memberId}`;
      const existingRecords: MedicalHistoryRecord[] = JSON.parse(localStorage.getItem(recordsKey) ?? "[]");

      const payload: MedicalHistoryRecord = {
        id: isEditMode && recordId ? recordId : `med-${Date.now()}`,
        memberId,
        date: medicalDate,
        condition,
        ageOfOnset: Number(ageOfOnset),
        treatment,
        status,
        notes,
      };

      if (isEditMode) {
        const idx = existingRecords.findIndex((r) => r.id === recordId);
        if (idx !== -1) {
          existingRecords[idx] = payload;
        }
        toast.success("Medical history updated successfully!");
      } else {
        existingRecords.unshift(payload);
        toast.success("Medical history created successfully!");
      }

      localStorage.setItem(recordsKey, JSON.stringify(existingRecords));
      onClose();
    } catch (err) {
      toast.error("Failed to save medical history");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800"
            title="Back"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <nav className="mb-0.5 flex items-center gap-1 text-xs text-slate-400">
              <button type="button" onClick={onClose} className="hover:text-slate-600">
                Medical History
              </button>
              <ChevronRight size={12} />
              <span className="font-medium text-slate-600">{isEditMode ? "Edit Record" : "New Record"}</span>
            </nav>
            <h1 className="font-serif text-xl font-bold text-slate-900">
              {isEditMode ? "Edit Medical History" : "Add Medical History"}
            </h1>
          </div>
        </div>
        <button
          onClick={handleReset}
          type="button"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
          title="Reset Form"
        >
          <RotateCcw size={14} />
          Reset
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <SectionCard title="Medical Details" icon={<Activity size={16} />}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Condition/Disease */}
            <div>
              <FieldLabel label="Condition / Disease" required />
              <input
                type="text"
                placeholder="e.g. Hypertension, Type 2 Diabetes"
                value={condition}
                onChange={(e) => {
                  setCondition(e.target.value);
                  setErrors((p) => ({ ...p, condition: "" }));
                }}
                className={`w-full border rounded-lg py-2.5 px-3 text-sm text-slate-950 bg-white outline-none focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/15 transition-all ${
                  errors.condition ? "border-red-300 bg-red-50/20" : "border-slate-200"
                }`}
              />
              {errors.condition && <p className="text-xs text-red-500 mt-1">{errors.condition}</p>}
            </div>

            {/* Date */}
            <div>
              <FieldLabel label="Record Date" required />
              <DatePicker
                value={medicalDate ? new Date(medicalDate) : undefined}
                onChange={(date) => {
                  setMedicalDate(date ? format(date, "yyyy-MM-dd") : "");
                  setErrors((p) => ({ ...p, medicalDate: "" }));
                }}
              />
              {errors.medicalDate && <p className="text-xs text-red-500 mt-1">{errors.medicalDate}</p>}
            </div>

            {/* Age of Onset */}
            <div>
              <FieldLabel label="Age of Onset" required />
              <input
                type="number"
                placeholder="e.g. 45"
                value={ageOfOnset}
                onChange={(e) => {
                  setAgeOfOnset(e.target.value);
                  setErrors((p) => ({ ...p, ageOfOnset: "" }));
                }}
                className={`w-full border rounded-lg py-2.5 px-3 text-sm text-slate-950 bg-white outline-none focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/15 transition-all ${
                  errors.ageOfOnset ? "border-red-300 bg-red-50/20" : "border-slate-200"
                }`}
              />
              {errors.ageOfOnset && <p className="text-xs text-red-500 mt-1">{errors.ageOfOnset}</p>}
            </div>

            {/* Status */}
            <SearchableSelect
              label="Status"
              required
              placeholder="Select status"
              error={errors.status}
              value={status}
              onChange={(val) => setStatus(val as any)}
              options={[
                { value: "Active", label: "Active" },
                { value: "Controlled", label: "Controlled" },
                { value: "Cured", label: "Cured" },
              ]}
            />

            {/* Treatment */}
            <div className="md:col-span-2">
              <FieldLabel label="Treatment / Medication" />
              <input
                type="text"
                placeholder="e.g. Metformin 500mg daily, lifestyle modifications"
                value={treatment}
                onChange={(e) => setTreatment(e.target.value)}
                className="w-full border border-slate-200 rounded-lg py-2.5 px-3 text-sm text-slate-950 bg-white outline-none focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/15 transition-all"
              />
            </div>

            {/* Notes */}
            <div className="md:col-span-2">
              <FieldLabel label="Additional Notes" />
              <textarea
                rows={3}
                placeholder="Any additional remarks..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full border border-slate-200 rounded-lg py-2.5 px-3 text-sm text-slate-950 bg-white outline-none focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/15 transition-all resize-none"
              />
            </div>
          </div>
        </SectionCard>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 py-4 border-t border-slate-200">
          <button
            onClick={onClose}
            type="button"
            className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-[#0B1220] hover:bg-[#16294D] disabled:bg-slate-400 text-white rounded-lg font-semibold text-sm shadow-sm transition-all duration-200 cursor-pointer"
          >
            <Save size={15} />
            {isEditMode ? "Save Changes" : "Save Medical History"}
          </button>
        </div>
      </form>
    </div>
  );
}
