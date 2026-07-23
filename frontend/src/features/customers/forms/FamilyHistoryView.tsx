"use client";

import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { RootState, AppDispatch } from "@/store/store";
import { fetchFamilyHistory, clearCurrentRecord } from "../familyHistorySlice";
import { ArrowLeft, Edit2, ShieldAlert, ChevronRight, FileText } from "lucide-react";
import { formatFamilyHistoryDate, CustomerSectionCard, CustomerTableFrame } from "@/features/customers/components/CustomerUi";

interface FamilyHistoryViewProps {
  recordId: string;
  onClose: () => void;
  onEdit: (id: string) => void;
}

function ViewField({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5">
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </span>
      <span className="text-sm font-semibold text-slate-800">{value || "—"}</span>
    </div>
  );
}

export default function FamilyHistoryView({ recordId, onClose, onEdit }: FamilyHistoryViewProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { currentRecord, isLoading, error } = useSelector((s: RootState) => s.familyHistory);

  useEffect(() => {
    if (recordId) {
      dispatch(fetchFamilyHistory(recordId));
    }
    return () => {
      dispatch(clearCurrentRecord());
    };
  }, [dispatch, recordId]);

  const calculateCurrentAge = (recordedAge: number, recordDate: string) => {
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
  };

  const getMemberFullName = (member: unknown) => {
    if (!member || typeof member !== "object") return "—";
    const typed = member as {
      salutation?: string | null;
      firstName?: string | null;
      middleName?: string | null;
      lastName?: string | null;
    };
    return [typed.salutation, typed.firstName, typed.middleName, typed.lastName].filter(Boolean).join(" ");
  };

  if (isLoading && !currentRecord) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-[#0B1220]" />
      </div>
    );
  }

  if (error && !currentRecord) {
    return (
      <div className="relative mx-auto max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-rose-400 via-rose-300 to-transparent" />
        <ShieldAlert className="mx-auto mb-4 text-rose-500" size={40} />
        <h3 className="mb-1 text-base font-semibold text-slate-900">Failed to load details</h3>
        <p className="mb-4 text-xs text-slate-500">{error}</p>
        <button
          onClick={onClose}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#0B1220] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#16294D]"
        >
          Back to list
        </button>
      </div>
    );
  }

  if (!currentRecord) return null;

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-8">
      {/* Header — mirrors the Customer Group / Master details page pattern */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800"
            title="Back to list"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <nav className="mb-0.5 flex items-center gap-1 text-xs text-slate-400">
              <button type="button" onClick={onClose} className="hover:text-slate-600">
                Family History
              </button>
              <ChevronRight size={12} />
              <span className="font-medium text-slate-600">
                {currentRecord.group?.groupName || currentRecord.group?.name || "Record"}
              </span>
            </nav>
            <h1 className="font-serif text-xl font-bold text-slate-900">Family History Details</h1>
          </div>
        </div>
        <button
          onClick={() => onEdit(currentRecord.id)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#0B1220] px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-[#0B1220]/20 transition-colors hover:bg-[#16294D]"
        >
          <Edit2 size={14} />
          Edit Record
        </button>
      </div>

      <CustomerSectionCard title="Basic Information" icon={FileText}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <ViewField label="Group Code" value={currentRecord.group?.groupCode || "—"} />
          <ViewField label="Group Name" value={currentRecord.group?.groupName || currentRecord.group?.name || "—"} />
          <ViewField label="Family History Date" value={formatFamilyHistoryDate(currentRecord.date)} />
          <ViewField label="Member Name" value={getMemberFullName(currentRecord.member)} />
        </div>
      </CustomerSectionCard>

      <CustomerSectionCard title="Family History Records" icon={ShieldAlert}>
        <CustomerTableFrame>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                <th className="px-4 py-2.5 text-left">Relation</th>
                <th className="px-4 py-2.5 text-left">Age Recorded</th>
                <th className="px-4 py-2.5 text-left">Current Age</th>
                <th className="px-4 py-2.5 text-left">State of Health</th>
                <th className="px-4 py-2.5 text-left">Age at Death</th>
                <th className="px-4 py-2.5 text-left">Cause of Death</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!currentRecord.records || currentRecord.records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                    No family records registered.
                  </td>
                </tr>
              ) : (
                currentRecord.records.map((r, index) => (
                  <tr key={index} className="transition-colors hover:bg-[#0B1220]/[0.025]">
                    <td className="px-4 py-3 font-semibold text-slate-800">{r.relation}</td>
                    <td className="px-4 py-3 text-slate-700">{r.age}</td>
                    <td className="px-4 py-3 text-slate-700">{r.isDead ? "—" : calculateCurrentAge(r.age, currentRecord.date)}</td>
                    <td className="px-4 py-3 text-slate-700">{r.stateOfHealth}</td>
                    <td className="px-4 py-3 text-slate-600">{r.isDead ? r.ageAtDeath : "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{r.isDead ? r.causeOfDeath : "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CustomerTableFrame>
      </CustomerSectionCard>
    </div>
  );
}