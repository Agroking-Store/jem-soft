"use client";

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { RootState, AppDispatch } from "@/store/store";
import {
  createFamilyHistory,
  updateFamilyHistory,
  fetchFamilyHistory,
  fetchGroupByCode,
  clearCurrentRecord,
  clearCurrentGroup,
  FamilyHistoryRecordItem,
} from "../familyHistorySlice";
import { ArrowLeft, RotateCcw, Plus, Trash2, Save, X } from "lucide-react";
import toast from "react-hot-toast";
import { formatFamilyHistoryDate } from "./FamilyHistoryList";

interface FamilyHistoryFormProps {
  recordId?: string;
  onClose: () => void;
}

const RELATIONS = [
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

// Helper components matching theme
function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
      {label}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

function SectionCard({
  title,
  children,
  headerActions,
}: {
  title: string;
  children: React.ReactNode;
  headerActions?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
      <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 border-b border-slate-200">
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">{title}</h2>
        {headerActions}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export default function FamilyHistoryForm({ recordId, onClose }: FamilyHistoryFormProps) {
  const dispatch = useDispatch<AppDispatch>();
  const isEditMode = !!recordId;

  // Global Redux State
  const { currentRecord, isLoading, currentGroup } = useSelector((s: RootState) => s.familyHistory);

  // Form states - Basic Details
  const [groupCode, setGroupCode] = useState("");
  const [groupName, setGroupName] = useState("");
  const [groupId, setGroupId] = useState("");
  const [familyHistoryDate, setFamilyHistoryDate] = useState(() => {
    // Default to today's date
    return new Date().toISOString().substring(0, 10);
  });
  const [memberId, setMemberId] = useState("");
  const [membersList, setMembersList] = useState<any[]>([]);

  // Form states - Relation detail input
  const [relation, setRelation] = useState("");
  const [age, setAge] = useState("");
  const [stateOfHealth, setStateOfHealth] = useState("");
  const [isDead, setIsDead] = useState(false);
  const [ageAtDeath, setAgeAtDeath] = useState("");
  const [causeOfDeath, setCauseOfDeath] = useState("");

  // Sub-records list
  const [tempRecords, setTempRecords] = useState<FamilyHistoryRecordItem[]>([]);

  // Validation state
  const [basicErrors, setBasicErrors] = useState<Record<string, string>>({});
  const [detailErrors, setDetailErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load record details for editing
  useEffect(() => {
    if (isEditMode && recordId) {
      dispatch(fetchFamilyHistory(recordId));
    }
    return () => {
      dispatch(clearCurrentRecord());
      dispatch(clearCurrentGroup());
    };
  }, [dispatch, isEditMode, recordId]);

  // Sync data when edit record is loaded
  useEffect(() => {
    if (isEditMode && currentRecord) {
      setGroupId(currentRecord.groupId);
      setGroupCode(currentRecord.group?.groupCode || "");
      setGroupName(currentRecord.group?.groupName || currentRecord.group?.name || "");
      setFamilyHistoryDate(currentRecord.date.substring(0, 10));
      setMemberId(currentRecord.memberId);
      if (currentRecord.records) {
        setTempRecords(currentRecord.records);
      }
      // Trigger member list fetch
      if (currentRecord.group?.groupCode) {
        dispatch(fetchGroupByCode(currentRecord.group.groupCode));
      }
    }
  }, [currentRecord, isEditMode, dispatch]);

  // Sync members list when looked up group changes
  useEffect(() => {
    if (currentGroup) {
      setGroupName(currentGroup.groupName || currentGroup.name || "");
      setGroupId(currentGroup.id);
      setMembersList(currentGroup.members || []);
    }
  }, [currentGroup]);

  // Lookup customer details when group code is entered
  const handleGroupCodeChange = async (val: string) => {
    setGroupCode(val);
    setBasicErrors((prev) => ({ ...prev, groupCode: "" }));
    
    if (val.trim().length >= 3) {
      try {
        const actionResult = await dispatch(fetchGroupByCode(val.trim()));
        if (fetchGroupByCode.fulfilled.match(actionResult)) {
          // Found and auto-filled
        } else {
          // Reset auto-filled values if not found
          setGroupName("");
          setGroupId("");
          setMembersList([]);
          setMemberId("");
        }
      } catch {
        setGroupName("");
        setGroupId("");
        setMembersList([]);
        setMemberId("");
      }
    } else {
      setGroupName("");
      setGroupId("");
      setMembersList([]);
      setMemberId("");
    }
  };

  // Calculate current age dynamically based on history date and age when recorded
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

  // Reset form helper
  const handleReset = () => {
    if (isEditMode) {
      if (currentRecord) {
        setGroupId(currentRecord.groupId);
        setGroupCode(currentRecord.group?.groupCode || "");
        setGroupName(currentRecord.group?.groupName || currentRecord.group?.name || "");
        setFamilyHistoryDate(currentRecord.date.substring(0, 10));
        setMemberId(currentRecord.memberId);
        setTempRecords(currentRecord.records || []);
      }
    } else {
      setGroupCode("");
      setGroupName("");
      setGroupId("");
      setFamilyHistoryDate(new Date().toISOString().substring(0, 10));
      setMemberId("");
      setMembersList([]);
      setTempRecords([]);
      setRelation("");
      setAge("");
      setStateOfHealth("");
      setIsDead(false);
      setAgeAtDeath("");
      setCauseOfDeath("");
      setBasicErrors({});
      setDetailErrors({});
    }
    toast.success("Form reset successfully");
  };

  // Add sub-record details to list
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
      relation,
      age: Number(age),
      stateOfHealth: stateOfHealth.trim(),
      isDead,
      ageAtDeath: isDead ? Number(ageAtDeath) : null,
      causeOfDeath: isDead ? causeOfDeath.trim() : null,
    };

    setTempRecords((prev) => [...prev, newRecord]);

    // Reset details form
    setRelation("");
    setAge("");
    setStateOfHealth("");
    setIsDead(false);
    setAgeAtDeath("");
    setCauseOfDeath("");
  };

  // Remove record from sub-table
  const handleRemoveDetail = (index: number) => {
    setTempRecords((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit form to backend
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors: Record<string, string> = {};
    if (!groupCode) errors.groupCode = "Group code is required";
    if (!groupId) errors.groupCode = "Valid group code is required";
    if (!familyHistoryDate) errors.familyHistoryDate = "Date is required";
    if (!memberId) errors.memberId = "Member selection is required";

    if (Object.keys(errors).length > 0) {
      setBasicErrors(errors);
      toast.error("Please fill all required basic details");
      return;
    }

    setBasicErrors({});

    if (tempRecords.length === 0) {
      toast.error("Please add at least one member's details to the records");
      return;
    }

    setIsSubmitting(true);
    const payload = {
      groupId,
      memberId,
      date: new Date(familyHistoryDate).toISOString(),
      records: tempRecords,
    };

    try {
      if (isEditMode && recordId) {
        await dispatch(updateFamilyHistory({ id: recordId, payload })).unwrap();
        toast.success("Family history updated successfully!");
      } else {
        await dispatch(createFamilyHistory(payload)).unwrap();
        toast.success("Family history created successfully!");
      }
      onClose();
    } catch (err: any) {
      toast.error(err || "Failed to save record");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getMemberFullName = (m: any) => {
    return [m.salutation, m.firstName, m.middleName, m.lastName].filter(Boolean).join(" ");
  };

  if (isEditMode && isLoading && !currentRecord) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Navbar / Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3 bg-transparent">
        <h1 className="text-xl font-bold text-slate-800">
          {isEditMode ? "Edit Family History" : "Add Family History"}
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            type="button"
            className="p-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-lg transition-colors cursor-pointer"
            title="Reset Form"
          >
            <RotateCcw size={16} />
          </button>
          <button
            onClick={onClose}
            type="button"
            className="p-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-lg transition-colors cursor-pointer"
            title="Back to List"
          >
            <ArrowLeft size={16} />
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Card 1: Basic Details */}
        <SectionCard title="Basic Details">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Group Code */}
            <div>
              <FieldLabel label="Group Code" required />
              <input
                type="text"
                placeholder="Enter Group Code"
                value={groupCode}
                onChange={(e) => handleGroupCodeChange(e.target.value)}
                className={`w-full border rounded-lg py-2.5 px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                  ${basicErrors.groupCode ? "border-red-300 bg-red-50/30" : "border-slate-200 bg-white hover:border-slate-300"}`}
              />
              {basicErrors.groupCode && <p className="text-xs text-red-500 mt-1">{basicErrors.groupCode}</p>}
            </div>

            {/* Group Name */}
            <div>
              <FieldLabel label="Group Name" />
              <input
                type="text"
                placeholder="Group Name"
                disabled
                value={groupName}
                className="w-full border border-slate-200 rounded-lg py-2.5 px-3 text-sm text-slate-500 bg-slate-50 cursor-not-allowed outline-none"
              />
            </div>

            {/* Family History Date */}
            <div>
              <FieldLabel label="Family History Date" required />
              <input
                type="date"
                value={familyHistoryDate}
                onChange={(e) => {
                  setFamilyHistoryDate(e.target.value);
                  setBasicErrors((p) => ({ ...p, familyHistoryDate: "" }));
                }}
                className={`w-full border rounded-lg py-2.5 px-3 text-sm text-slate-900 outline-none transition-all focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                  ${basicErrors.familyHistoryDate ? "border-red-300 bg-red-50/30" : "border-slate-200 bg-white hover:border-slate-300"}`}
              />
              {basicErrors.familyHistoryDate && (
                <p className="text-xs text-red-500 mt-1">{basicErrors.familyHistoryDate}</p>
              )}
            </div>

            {/* Member Name */}
            <div className="md:col-span-3">
              <FieldLabel label="Member Name" required />
              <select
                value={memberId}
                onChange={(e) => {
                  setMemberId(e.target.value);
                  setBasicErrors((p) => ({ ...p, memberId: "" }));
                }}
                className={`w-full border rounded-lg py-2.5 px-3 text-sm text-slate-900 outline-none transition-all bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                  ${basicErrors.memberId ? "border-red-300 bg-red-50/30" : "border-slate-200 hover:border-slate-300"}`}
              >
                <option value="">Select Member Name</option>
                {membersList.map((m) => (
                  <option key={m.id} value={m.id}>
                    {getMemberFullName(m)}
                  </option>
                ))}
              </select>
              {basicErrors.memberId && <p className="text-xs text-red-500 mt-1">{basicErrors.memberId}</p>}
            </div>
          </div>
        </SectionCard>

        {/* Card 2: Family History Records (relations grid) */}
        <SectionCard
          title="Family History Records"
          headerActions={
            <button
              onClick={handleAddDetail}
              type="button"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
            >
              <Plus size={14} />
              Add New
            </button>
          }
        >
          {/* Member's Details Subform */}
          <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-200/60 mb-5">
            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-4">Member's Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Relation */}
              <div>
                <FieldLabel label="Relation" required />
                <select
                  value={relation}
                  onChange={(e) => {
                    setRelation(e.target.value);
                    setDetailErrors((p) => ({ ...p, relation: "" }));
                  }}
                  className={`w-full border rounded-lg py-2 px-3 text-sm text-slate-900 outline-none bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                    ${detailErrors.relation ? "border-red-300 bg-red-50/30" : "border-slate-200 hover:border-slate-300"}`}
                >
                  <option value="">Select Relation</option>
                  {RELATIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                {detailErrors.relation && <p className="text-xs text-red-500 mt-1">{detailErrors.relation}</p>}
              </div>

              {/* Age */}
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
                  className={`w-full border rounded-lg py-2 px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                    ${detailErrors.age ? "border-red-300 bg-red-50/30" : "border-slate-200 bg-white hover:border-slate-300"}`}
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Current Age</span>
                {detailErrors.age && <p className="text-xs text-red-500 mt-1">{detailErrors.age}</p>}
              </div>

              {/* State of Health */}
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
                  className={`w-full border rounded-lg py-2 px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                    ${detailErrors.stateOfHealth ? "border-red-300 bg-red-50/30" : "border-slate-200 bg-white hover:border-slate-300"}`}
                />
                {detailErrors.stateOfHealth && (
                  <p className="text-xs text-red-500 mt-1">{detailErrors.stateOfHealth}</p>
                )}
              </div>

              {/* Is Dead Checkbox */}
              <div className="md:col-span-3 flex items-center gap-2 py-1">
                <input
                  type="checkbox"
                  id="isDead"
                  checked={isDead}
                  onChange={(e) => {
                    setIsDead(e.target.checked);
                    setDetailErrors((p) => ({ ...p, ageAtDeath: "", causeOfDeath: "" }));
                  }}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="isDead" className="text-xs font-semibold text-slate-600 uppercase cursor-pointer select-none">
                  Is Dead
                </label>
              </div>

              {/* Conditionally show death details */}
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
                      className={`w-full border rounded-lg py-2 px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
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
                      className={`w-full border rounded-lg py-2 px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                        ${detailErrors.causeOfDeath ? "border-red-300 bg-red-50/30" : "border-slate-200 bg-white hover:border-slate-300"}`}
                    />
                    {detailErrors.causeOfDeath && (
                      <p className="text-xs text-red-500 mt-1">{detailErrors.causeOfDeath}</p>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Actions for Subform */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-200/50 mt-4 pt-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-450 text-white rounded-lg font-semibold text-sm shadow-sm transition-all duration-200 cursor-pointer"
              >
                <Save size={15} />
                Save
              </button>
              <button
                onClick={onClose}
                type="button"
                className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-lg transition-colors cursor-pointer"
              >
                Cancel
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
                {tempRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 font-medium bg-white">
                      No Family History Records available to display.
                    </td>
                  </tr>
                ) : (
                  tempRecords.map((r, index) => (
                    <tr key={index} className="hover:bg-slate-50/40 transition-colors">
                      <td className="py-2.5 px-4 text-slate-600">
                        {formatFamilyHistoryDate(familyHistoryDate)}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-slate-800">{r.relation}</td>
                      <td className="py-2.5 px-4 text-slate-700">{r.age}</td>
                      <td className="py-2.5 px-4 text-slate-700">
                        {r.isDead ? "—" : calculateCurrentAge(r.age, familyHistoryDate)}
                      </td>
                      <td className="py-2.5 px-4 text-slate-700">{r.stateOfHealth}</td>
                      <td className="py-2.5 px-4 text-slate-600">{r.isDead ? r.ageAtDeath : "—"}</td>
                      <td className="py-2.5 px-4 text-slate-600">{r.isDead ? r.causeOfDeath : "—"}</td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          onClick={() => handleRemoveDetail(index)}
                          type="button"
                          className="p-1 text-slate-400 hover:text-red-650 hover:bg-red-50 rounded transition-colors cursor-pointer"
                          title="Remove item"
                        >
                          <X size={15} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </form>
    </div>
  );
}
