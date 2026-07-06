"use client";

import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { RootState, AppDispatch } from "@/store/store";
import { fetchFamilyHistory, clearCurrentRecord } from "../familyHistorySlice";
import { ArrowLeft, Edit2, ShieldAlert } from "lucide-react";
import { formatFamilyHistoryDate } from "./FamilyHistoryList";

interface FamilyHistoryViewProps {
  recordId: string;
  onClose: () => void;
  onEdit: (id: string) => void;
}

function ViewField({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-100">
      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
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

  const getMemberFullName = (member: any) => {
    if (!member) return "—";
    return [member.salutation, member.firstName, member.middleName, member.lastName]
      .filter(Boolean)
      .join(" ");
  };

  if (isLoading && !currentRecord) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error && !currentRecord) {
    return (
      <div className="max-w-md mx-auto text-center py-12 bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <ShieldAlert className="mx-auto text-red-500 mb-4" size={40} />
        <h3 className="text-base font-bold text-slate-800 mb-1">Failed to Load Details</h3>
        <p className="text-xs text-slate-500 mb-4">{error}</p>
        <button
          onClick={onClose}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
        >
          Back to List
        </button>
      </div>
    );
  }

  if (!currentRecord) return null;

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Family History Details</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Group: {currentRecord.group?.groupName || currentRecord.group?.name || "—"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onEdit(currentRecord.id)}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
          >
            <Edit2 size={13} />
            Edit Record
          </button>
          <button
            onClick={onClose}
            className="p-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-lg transition-colors cursor-pointer"
            title="Back to List"
          >
            <ArrowLeft size={15} />
          </button>
        </div>
      </div>

      {/* Basic Details Grid */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-5">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
          Basic Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <ViewField label="Group Code" value={currentRecord.group?.groupCode || "—"} />
          <ViewField label="Group Name" value={currentRecord.group?.groupName || currentRecord.group?.name || "—"} />
          <ViewField label="Family History Date" value={formatFamilyHistoryDate(currentRecord.date)} />
          <ViewField label="Member Name" value={getMemberFullName(currentRecord.member)} />
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Family History Records
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                <th className="py-2.5 px-4 text-left">Relation</th>
                <th className="py-2.5 px-4 text-left">Age Recorded</th>
                <th className="py-2.5 px-4 text-left">Current Age</th>
                <th className="py-2.5 px-4 text-left">State of Health</th>
                <th className="py-2.5 px-4 text-left">Age at Death</th>
                <th className="py-2.5 px-4 text-left">Cause of Death</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!currentRecord.records || currentRecord.records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 font-medium bg-white">
                    No family records registered.
                  </td>
                </tr>
              ) : (
                currentRecord.records.map((r, index) => (
                  <tr key={index} className="hover:bg-slate-50/40 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-800">{r.relation}</td>
                    <td className="py-3 px-4 text-slate-700">{r.age}</td>
                    <td className="py-3 px-4 text-slate-700">
                      {r.isDead ? "—" : calculateCurrentAge(r.age, currentRecord.date)}
                    </td>
                    <td className="py-3 px-4 text-slate-700">{r.stateOfHealth}</td>
                    <td className="py-3 px-4 text-slate-600">{r.isDead ? r.ageAtDeath : "—"}</td>
                    <td className="py-3 px-4 text-slate-600">{r.isDead ? r.causeOfDeath : "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
