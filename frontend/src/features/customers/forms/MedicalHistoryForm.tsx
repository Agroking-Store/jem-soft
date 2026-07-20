"use client";

import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { RootState, AppDispatch } from "@/store/store";
import {
  createMedicalHistory,
  updateMedicalHistory,
  fetchMedicalHistory,
  clearCurrentMedicalRecord,
  type MedicalHistoryRecordItem,
} from "../medicalHistorySlice";
import { Save, RotateCcw, Activity, Droplet, Stethoscope } from "lucide-react";
import { format } from "date-fns";
import DatePicker from "@/app/(dashboard)/dashboard/lic/policies/new/DatePicker";
import toast from "react-hot-toast";
import { SearchableSelect } from "@/features/customers/components/CustomerUi";

interface MedicalHistoryFormProps {
  recordId?: string;
  memberId: string;
  onClose: () => void;
  /** Called after a successful create/update so the parent can refresh its list. */
  onSaved?: () => void;
}

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

function calcAgeFromDob(dob?: string | null): number | null {
  if (!dob) return null;
  try {
    const birth = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age >= 0 ? age : null;
  } catch {
    return null;
  }
}

export default function MedicalHistoryForm({ recordId, memberId, onClose, onSaved }: MedicalHistoryFormProps) {
  const dispatch = useDispatch<AppDispatch>();
  const isEditMode = !!recordId;

  const { currentRecord, isLoading } = useSelector((s: RootState) => s.medicalHistory);
  // Member record already loaded in the customerMaster slice for this memberId.
  const member = useSelector((s: RootState) =>
    s.customerMaster.customers.find((c) => c.id === memberId) ??
    (s.customerMaster.currentCustomer?.id === memberId ? s.customerMaster.currentCustomer : null)
  );

  const derivedAge = calcAgeFromDob(member?.dob);
  const derivedGender = member?.gender || null;

  // Form states
  const [medicalHistoryDate, setMedicalHistoryDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [bloodGroup, setBloodGroup] = useState("");
  const [bloodPressure, setBloodPressure] = useState("");
  const [pulse, setPulse] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [chest, setChest] = useState("");
  const [abdomen, setAbdomen] = useState("");
  const [identificationMark, setIdentificationMark] = useState("");
  const [spectaclesDetails, setSpectaclesDetails] = useState("");
  const [dentalDetails, setDentalDetails] = useState("");
  const [majorIllness, setMajorIllness] = useState("");
  const [operationAccident, setOperationAccident] = useState("");
  const [specialReport, setSpecialReport] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [medicalExaminationDate, setMedicalExaminationDate] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load record details from the store when editing
  useEffect(() => {
    if (isEditMode && recordId) {
      dispatch(fetchMedicalHistory(recordId));
    }
    return () => {
      dispatch(clearCurrentMedicalRecord());
    };
  }, [dispatch, isEditMode, recordId]);

  // Sync form when the loaded record arrives
  useEffect(() => {
    if (isEditMode && currentRecord && currentRecord.id === recordId) {
      const r = currentRecord.records?.[0];
      setMedicalHistoryDate((r?.medicalHistoryDate || currentRecord.date).substring(0, 10));
      setBloodGroup(r?.bloodGroup || "");
      setBloodPressure(r?.bloodPressure || "");
      setPulse(r?.pulse || "");
      setHeight(r?.height != null ? String(r.height) : "");
      setWeight(r?.weight != null ? String(r.weight) : "");
      setChest(r?.chest != null ? String(r.chest) : "");
      setAbdomen(r?.abdomen != null ? String(r.abdomen) : "");
      setIdentificationMark(r?.identificationMark || "");
      setSpectaclesDetails(r?.spectaclesDetails || "");
      setDentalDetails(r?.dentalDetails || "");
      setMajorIllness(r?.majorIllness || "");
      setOperationAccident(r?.operationAccident || "");
      setSpecialReport(r?.specialReport || "");
      setDoctorName(r?.doctorName || "");
      setMedicalExaminationDate(r?.medicalExaminationDate ? r.medicalExaminationDate.substring(0, 10) : "");
    }
  }, [isEditMode, currentRecord, recordId]);

  const handleReset = () => {
    if (isEditMode && currentRecord) {
      const r = currentRecord.records?.[0];
      setMedicalHistoryDate((r?.medicalHistoryDate || currentRecord.date).substring(0, 10));
      setBloodGroup(r?.bloodGroup || "");
      setBloodPressure(r?.bloodPressure || "");
      setPulse(r?.pulse || "");
      setHeight(r?.height != null ? String(r.height) : "");
      setWeight(r?.weight != null ? String(r.weight) : "");
      setChest(r?.chest != null ? String(r.chest) : "");
      setAbdomen(r?.abdomen != null ? String(r.abdomen) : "");
      setIdentificationMark(r?.identificationMark || "");
      setSpectaclesDetails(r?.spectaclesDetails || "");
      setDentalDetails(r?.dentalDetails || "");
      setMajorIllness(r?.majorIllness || "");
      setOperationAccident(r?.operationAccident || "");
      setSpecialReport(r?.specialReport || "");
      setDoctorName(r?.doctorName || "");
      setMedicalExaminationDate(r?.medicalExaminationDate ? r.medicalExaminationDate.substring(0, 10) : "");
    } else {
      setMedicalHistoryDate(new Date().toISOString().substring(0, 10));
      setBloodGroup("");
      setBloodPressure("");
      setPulse("");
      setHeight("");
      setWeight("");
      setChest("");
      setAbdomen("");
      setIdentificationMark("");
      setSpectaclesDetails("");
      setDentalDetails("");
      setMajorIllness("");
      setOperationAccident("");
      setSpecialReport("");
      setDoctorName("");
      setMedicalExaminationDate("");
    }
    setErrors({});
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!medicalHistoryDate) newErrors.medicalHistoryDate = "Medical history date is required";
    if (!bloodGroup) newErrors.bloodGroup = "Blood group is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    const record: MedicalHistoryRecordItem = {
      medicalHistoryDate: new Date(medicalHistoryDate).toISOString(),
      age: derivedAge,
      gender: derivedGender,
      bloodGroup,
      bloodPressure: bloodPressure.trim() || null,
      pulse: pulse.trim() || null,
      height: height ? Number(height) : null,
      weight: weight ? Number(weight) : null,
      chest: chest ? Number(chest) : null,
      abdomen: abdomen ? Number(abdomen) : null,
      identificationMark: identificationMark.trim() || null,
      spectaclesDetails: spectaclesDetails.trim() || null,
      dentalDetails: dentalDetails.trim() || null,
      majorIllness: majorIllness.trim() || null,
      operationAccident: operationAccident.trim() || null,
      specialReport: specialReport.trim() || null,
      doctorName: doctorName.trim() || null,
      medicalExaminationDate: medicalExaminationDate ? new Date(medicalExaminationDate).toISOString() : null,
    };

    const payload = {
      memberId,
      date: new Date(medicalHistoryDate).toISOString(),
      records: [record],
    };

    try {
      if (isEditMode && recordId) {
        await dispatch(updateMedicalHistory({ id: recordId, payload })).unwrap();
        toast.success("Medical history updated successfully!");
      } else {
        await dispatch(createMedicalHistory(payload)).unwrap();
        toast.success("Medical history created successfully!");
      }
      onSaved?.();
      onClose();
    } catch (err: any) {
      toast.error(err || "Failed to save medical history");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isEditMode && isLoading && !currentRecord) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0B1220]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-8">
      {/* Slim action row (no duplicate header — the modal shell provides the title + close) */}
      <div className="flex items-center justify-end">
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
        <SectionCard title="Basic Details" icon={<Activity size={16} />}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <FieldLabel label="Medical History Date" required />
              <DatePicker
                value={medicalHistoryDate ? new Date(medicalHistoryDate) : undefined}
                onChange={(date) => {
                  setMedicalHistoryDate(date ? format(date, "yyyy-MM-dd") : "");
                  setErrors((p) => ({ ...p, medicalHistoryDate: "" }));
                }}
              />
              {errors.medicalHistoryDate && <p className="text-xs text-red-500 mt-1">{errors.medicalHistoryDate}</p>}
            </div>
            <ReadOnlyField label="Age (from DOB)" value={derivedAge != null ? String(derivedAge) : null} />
            <ReadOnlyField label="Gender" value={derivedGender} />
          </div>
        </SectionCard>

        <SectionCard title="Member's Details" icon={<Droplet size={16} />}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <SearchableSelect
              label="Blood Group"
              required
              placeholder="Select blood group"
              error={errors.bloodGroup}
              value={bloodGroup}
              onChange={(val) => {
                setBloodGroup(val);
                setErrors((p) => ({ ...p, bloodGroup: "" }));
              }}
              options={BLOOD_GROUPS.map((g) => ({ value: g, label: g }))}
            />
            <div>
              <FieldLabel label="Blood Pressure (mmHg)" />
              <input type="text" placeholder="e.g. 120/80" value={bloodPressure} onChange={(e) => setBloodPressure(e.target.value)} className="w-full border border-slate-200 rounded-lg py-2.5 px-3 text-sm text-slate-950 bg-white outline-none focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/15 transition-all" />
            </div>
            <div>
              <FieldLabel label="Pulse (bpm)" />
              <input type="text" placeholder="e.g. 72" value={pulse} onChange={(e) => setPulse(e.target.value)} className="w-full border border-slate-200 rounded-lg py-2.5 px-3 text-sm text-slate-950 bg-white outline-none focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/15 transition-all" />
            </div>
            <div>
              <FieldLabel label="Height (Cms)" />
              <input type="number" placeholder="e.g. 172" value={height} onChange={(e) => setHeight(e.target.value)} className="w-full border border-slate-200 rounded-lg py-2.5 px-3 text-sm text-slate-950 bg-white outline-none focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/15 transition-all" />
            </div>
            <div>
              <FieldLabel label="Weight (Kgs)" />
              <input type="number" placeholder="e.g. 68" value={weight} onChange={(e) => setWeight(e.target.value)} className="w-full border border-slate-200 rounded-lg py-2.5 px-3 text-sm text-slate-950 bg-white outline-none focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/15 transition-all" />
            </div>
            <div>
              <FieldLabel label="Chest (Cms)" />
              <input type="number" placeholder="e.g. 90" value={chest} onChange={(e) => setChest(e.target.value)} className="w-full border border-slate-200 rounded-lg py-2.5 px-3 text-sm text-slate-950 bg-white outline-none focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/15 transition-all" />
            </div>
            <div>
              <FieldLabel label="Abdomen (Cms)" />
              <input type="number" placeholder="e.g. 85" value={abdomen} onChange={(e) => setAbdomen(e.target.value)} className="w-full border border-slate-200 rounded-lg py-2.5 px-3 text-sm text-slate-950 bg-white outline-none focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/15 transition-all" />
            </div>
            <div>
              <FieldLabel label="Identification Mark" />
              <input type="text" placeholder="e.g. Mole on left forearm" value={identificationMark} onChange={(e) => setIdentificationMark(e.target.value)} className="w-full border border-slate-200 rounded-lg py-2.5 px-3 text-sm text-slate-950 bg-white outline-none focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/15 transition-all" />
            </div>
            <div>
              <FieldLabel label="Spectacles Details" />
              <input type="text" placeholder="e.g. -2.5 power" value={spectaclesDetails} onChange={(e) => setSpectaclesDetails(e.target.value)} className="w-full border border-slate-200 rounded-lg py-2.5 px-3 text-sm text-slate-950 bg-white outline-none focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/15 transition-all" />
            </div>
            <div className="md:col-span-3">
              <FieldLabel label="Dental Details" />
              <input type="text" placeholder="e.g. Upper molar crown" value={dentalDetails} onChange={(e) => setDentalDetails(e.target.value)} className="w-full border border-slate-200 rounded-lg py-2.5 px-3 text-sm text-slate-950 bg-white outline-none focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/15 transition-all" />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Examination Details" icon={<Stethoscope size={16} />}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <FieldLabel label="Major Illness" />
              <textarea rows={2} placeholder="Any major illness history..." value={majorIllness} onChange={(e) => setMajorIllness(e.target.value)} className="w-full border border-slate-200 rounded-lg py-2.5 px-3 text-sm text-slate-950 bg-white outline-none focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/15 transition-all resize-none" />
            </div>
            <div className="md:col-span-2">
              <FieldLabel label="Operation / Accident" />
              <textarea rows={2} placeholder="Any operation or accident history..." value={operationAccident} onChange={(e) => setOperationAccident(e.target.value)} className="w-full border border-slate-200 rounded-lg py-2.5 px-3 text-sm text-slate-950 bg-white outline-none focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/15 transition-all resize-none" />
            </div>
            <div className="md:col-span-2">
              <FieldLabel label="Special Report" />
              <textarea rows={2} placeholder="Any special report..." value={specialReport} onChange={(e) => setSpecialReport(e.target.value)} className="w-full border border-slate-200 rounded-lg py-2.5 px-3 text-sm text-slate-950 bg-white outline-none focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/15 transition-all resize-none" />
            </div>
            <div>
              <FieldLabel label="Doctor Name" />
              <input type="text" placeholder="e.g. Dr. Sharma" value={doctorName} onChange={(e) => setDoctorName(e.target.value)} className="w-full border border-slate-200 rounded-lg py-2.5 px-3 text-sm text-slate-950 bg-white outline-none focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/15 transition-all" />
            </div>
            <div>
              <FieldLabel label="Medical Examination Date" />
              <DatePicker
                value={medicalExaminationDate ? new Date(medicalExaminationDate) : undefined}
                onChange={(date) => setMedicalExaminationDate(date ? format(date, "yyyy-MM-dd") : "")}
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
