"use client";

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { RootState, AppDispatch } from "@/store/store";
import {
  createFamilyHistory,
  updateFamilyHistory,
  fetchFamilyHistory,
  fetchGroupById,
  clearCurrentRecord,
  clearCurrentGroup,
  FamilyHistoryRecordItem,
} from "../familyHistorySlice";
import { fetchCustomers } from "@/features/customers/customerSlice";
import { ArrowLeft, RotateCcw, Plus, Trash2, Save, X } from "lucide-react";
import toast from "react-hot-toast";
import { formatFamilyHistoryDate } from "./FamilyHistoryList";

interface FamilyHistoryFormProps {
  recordId?: string;
  onClose: () => void;
}

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
  const { customers: allGroups } = useSelector((s: RootState) => s.customers);

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

  // Search dropdown states
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Load record details and fetch customers for dropdown
  useEffect(() => {
    dispatch(fetchCustomers());
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
      const name = currentRecord.group?.groupName || currentRecord.group?.name || "";
      setGroupName(name);
      setSearchQuery(name);
      setFamilyHistoryDate(currentRecord.date.substring(0, 10));
      setMemberId(currentRecord.memberId);
      if (currentRecord.records) {
        setTempRecords(currentRecord.records);
      }
      // Trigger member list fetch
      if (currentRecord.groupId) {
        dispatch(fetchGroupById(currentRecord.groupId));
      }
    }
  }, [currentRecord, isEditMode, dispatch]);

  // Sync members list when looked up group changes
  useEffect(() => {
    if (currentGroup) {
      const name = currentGroup.groupName || currentGroup.name || "";
      setGroupName(name);
      setGroupId(currentGroup.id);
      setMembersList(currentGroup.members || []);
      // If we are editing, keep the memberId. Otherwise, reset memberId if it's not in the new group.
      if (!isEditMode) {
        setMemberId("");
      }
    }
  }, [currentGroup, isEditMode]);

  // Handle typing in Group Name input
  const handleGroupNameChange = (val: string) => {
    setGroupName(val);
    setSearchQuery(val);
    setIsDropdownOpen(true);
    setBasicErrors((prev) => ({ ...prev, groupName: "" }));

    // Reset groupId and groupCode since user is performing a new search
    setGroupId("");
    setGroupCode("");
    setMembersList([]);
    setMemberId("");
  };

  // Handle selecting a group from dropdown
  const handleSelectGroup = (g: any) => {
    const name = g.groupName || g.name || "";
    setGroupName(name);
    setSearchQuery(name);
    setGroupCode(g.groupCode || "");
    setGroupId(g.id);
    setIsDropdownOpen(false);
    setBasicErrors((prev) => ({ ...prev, groupName: "" }));

    // Fetch members list for this group
    dispatch(fetchGroupById(g.id));
  };

  // Filter groups for dropdown
  const filteredGroups = allGroups.filter((g: any) => {
    const nameStr = (g.groupName || g.name || "").toLowerCase();
    const codeStr = (g.groupCode || "").toLowerCase();
    const query = searchQuery.toLowerCase();
    return nameStr.includes(query) || codeStr.includes(query);
  });

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

  // Reset form helper
  const handleReset = () => {
    if (isEditMode) {
      if (currentRecord) {
        setGroupId(currentRecord.groupId);
        setGroupCode(currentRecord.group?.groupCode || "");
        const name = currentRecord.group?.groupName || currentRecord.group?.name || "";
        setGroupName(name);
        setSearchQuery(name);
        setFamilyHistoryDate(currentRecord.date.substring(0, 10));
        setMemberId(currentRecord.memberId);
        setTempRecords(currentRecord.records || []);
        if (currentRecord.groupId) {
          dispatch(fetchGroupById(currentRecord.groupId));
        }
      }
    } else {
      setGroupCode("");
      setGroupName("");
      setSearchQuery("");
      setGroupId("");
      setFamilyHistoryDate(new Date().toISOString().substring(0, 10));
      setMemberId("");
      setMembersList([]);
      setTempRecords([]);
      handleClearDetail();
      setBasicErrors({});
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
      id: editingIndex !== null ? tempRecords[editingIndex].id : undefined,
      relation,
      age: Number(age),
      stateOfHealth: stateOfHealth.trim(),
      isDead,
      ageAtDeath: isDead ? Number(ageAtDeath) : null,
      causeOfDeath: isDead ? causeOfDeath.trim() : null,
    };

    if (editingIndex !== null) {
      setTempRecords((prev) => {
        const updated = [...prev];
        updated[editingIndex] = newRecord;
        return updated;
      });
      toast.success("Entry updated in table");
      setEditingIndex(null);
    } else {
      setTempRecords((prev) => [...prev, newRecord]);
      toast.success("Entry added to table");
    }

    handleClearDetail();
  };

  // Remove record from sub-table
  const handleRemoveDetail = (index: number) => {
    setTempRecords((prev) => prev.filter((_, i) => i !== index));
    if (editingIndex === index) {
      handleClearDetail();
    }
  };

  // Submit form to backend
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors: Record<string, string> = {};
    if (!groupName) errors.groupName = "Group name is required";
    if (!groupId) errors.groupName = "Valid group selection is required";
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Group Name */}
            <div className="relative">
              <FieldLabel label="Group Name" required />
              <input
                type="text"
                placeholder="Search Group Name"
                value={searchQuery}
                onFocus={() => setIsDropdownOpen(true)}
                onChange={(e) => handleGroupNameChange(e.target.value)}
                className={`w-full border rounded-lg py-2.5 px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer
                  ${basicErrors.groupName ? "border-red-300 bg-red-50/30" : "border-slate-200 bg-white hover:border-slate-300"}`}
              />
              {basicErrors.groupName && <p className="text-xs text-red-500 mt-1">{basicErrors.groupName}</p>}

              {isDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsDropdownOpen(false)}
                  />
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto z-20 divide-y divide-slate-100">
                    {filteredGroups.length === 0 ? (
                      <div className="p-3 text-sm text-slate-400 text-center">No groups found</div>
                    ) : (
                      filteredGroups.map((g: any) => (
                        <div
                          key={g.id}
                          onClick={() => handleSelectGroup(g)}
                          className="flex justify-between items-center px-4 py-2.5 hover:bg-slate-50 cursor-pointer transition-colors"
                        >
                          <span className="font-semibold text-slate-800 text-sm">
                            {g.groupName || g.name}
                          </span>
                          {g.groupCode && (
                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                              {g.groupCode}
                            </span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Group Code */}
            <div>
              <FieldLabel label="Group Code" />
              <input
                type="text"
                placeholder="Group Code (Autofilled)"
                value={groupCode}
                disabled
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
                className={`w-full border rounded-lg py-2.5 px-3 text-sm text-slate-900 outline-none transition-all focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer
                  ${basicErrors.familyHistoryDate ? "border-red-300 bg-red-50/30" : "border-slate-200 bg-white hover:border-slate-300"}`}
              />
              {basicErrors.familyHistoryDate && (
                <p className="text-xs text-red-500 mt-1">{basicErrors.familyHistoryDate}</p>
              )}
            </div>

            {/* Member Name */}
            <div>
              <FieldLabel label="Member Name" required />
              <select
                value={memberId}
                onChange={(e) => {
                  setMemberId(e.target.value);
                  setBasicErrors((p) => ({ ...p, memberId: "" }));
                }}
                className={`w-full border rounded-lg py-2.5 px-3 text-sm text-slate-900 outline-none transition-all bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer
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
        <SectionCard title="Family History Records">
          {/* Member's Details Subform */}
          <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-200/60 mb-5">
            <h3 className="text-xs font-bold text-slate-650 uppercase tracking-wider mb-4 flex justify-between items-center">
              <span>Member's Details</span>
              {editingIndex !== null && (
                <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-semibold normal-case">
                  Editing Entry #{editingIndex + 1}
                </span>
              )}
            </h3>
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
                  className={`w-full border rounded-lg py-2 px-3 text-sm text-slate-900 outline-none bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer
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
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
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
                onClick={handleClearDetail}
                type="button"
                className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-lg transition-colors cursor-pointer"
              >
                {editingIndex !== null ? "Cancel Edit" : "Clear Entry"}
              </button>
              <button
                onClick={handleAddDetail}
                type="button"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-650 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm shadow-sm transition-all duration-200 cursor-pointer"
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
                {tempRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 font-medium bg-white">
                      No Family History Records available to display.
                    </td>
                  </tr>
                ) : (
                  tempRecords.map((r, index) => {
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
                            ? "bg-blue-50/70 hover:bg-blue-50 font-semibold"
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
                            <span className="ml-2 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold uppercase">
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
                            className="p-1 text-slate-400 hover:text-red-650 hover:bg-red-50 rounded transition-colors cursor-pointer"
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
        </SectionCard>

        {/* Main Form Actions */}
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
            className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-450 text-white rounded-lg font-semibold text-sm shadow-sm transition-all duration-200 cursor-pointer"
          >
            <Save size={15} />
            {isEditMode ? "Save Changes" : "Save Family History"}
          </button>
        </div>
      </form>
    </div>
  );
}
