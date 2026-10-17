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
import { ArrowLeft, RotateCcw, Plus, Trash2, Save, X, ChevronRight, Users } from "lucide-react";
import { format } from "date-fns";
import DatePicker from "@/app/(dashboard)/dashboard/lic/policies/new/DatePicker";
import toast from "react-hot-toast";
import { formatFamilyHistoryDate, SearchableSelect } from "@/features/customers/components/CustomerUi";
import FamilyHistoryRecordsEditor from "./FamilyHistoryRecordsEditor";

interface FamilyHistoryFormProps {
  recordId?: string;
  onClose: () => void;
  preselectedMemberId?: string;
  preselectedGroupId?: string;
}

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
    <div className="relative mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
      <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#1877F2] via-[#1877F2]/40 to-transparent" />
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3.5">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">{title}</h2>
        {headerActions}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export default function FamilyHistoryForm({ recordId, onClose, preselectedMemberId, preselectedGroupId }: FamilyHistoryFormProps) {
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

  // Sub-records list
  const [tempRecords, setTempRecords] = useState<FamilyHistoryRecordItem[]>([]);

  // Validation state
  const [basicErrors, setBasicErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Pre-select group/member when props are provided (create mode from detail page)
  useEffect(() => {
    if (!isEditMode && preselectedGroupId) {
      dispatch(fetchGroupById(preselectedGroupId));
    }
  }, [isEditMode, preselectedGroupId, dispatch]);

  // Sync data when edit record is loaded
  useEffect(() => {
    if (isEditMode && currentRecord) {
      setGroupId(currentRecord.groupId);
      setGroupCode(currentRecord.group?.groupCode || "");
      const name = currentRecord.group?.groupName || currentRecord.group?.name || "";
      setGroupName(name);
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
      setGroupCode(currentGroup.groupCode || "");
      setGroupId(currentGroup.id);
      setMembersList(currentGroup.members || []);
      // If we are editing, keep the memberId. Otherwise, pre-select if provided, or reset.
      if (!isEditMode) {
        if (preselectedMemberId && (currentGroup.members || []).some((m: any) => m.id === preselectedMemberId)) {
          setMemberId(preselectedMemberId);
        } else {
          setMemberId("");
        }
      }
    }
  }, [currentGroup, isEditMode, preselectedMemberId]);

  // Handle selecting a group from the SearchableSelect dropdown
  const handleSelectGroup = (g: any) => {
    const name = g.groupName || g.name || "";
    setGroupName(name);
    setGroupCode(g.groupCode || "");
    setGroupId(g.id);
    setBasicErrors((prev) => ({ ...prev, groupName: "" }));

    // Fetch members list for this group
    dispatch(fetchGroupById(g.id));
  };

  // Reset form helper
  const handleReset = () => {
    if (isEditMode) {
      if (currentRecord) {
        setGroupId(currentRecord.groupId);
        setGroupCode(currentRecord.group?.groupCode || "");
        const name = currentRecord.group?.groupName || currentRecord.group?.name || "";
        setGroupName(name);
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
      setGroupId("");
      setFamilyHistoryDate(new Date().toISOString().substring(0, 10));
      setMemberId("");
      setMembersList([]);
      setTempRecords([]);
      setBasicErrors({});
    }
    toast.success("Form reset successfully");
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
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1877F2]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-8">
      {/* Header — mirrors the Customer Group / Master create & edit page pattern */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            type="button"
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
              <span className="font-medium text-slate-600">{isEditMode ? "Edit Record" : "New Record"}</span>
            </nav>
            <h1 className="text-xl font-bold text-slate-900">
              {isEditMode ? "Edit Family History" : "Add Family History"}
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
        {/* Card 1: Basic Details */}
        <SectionCard title="Basic Details">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Group Name — shadcn-style searchable dropdown */}
            <SearchableSelect
              label="Group Name"
              required
              icon={<Users size={14} />}
              placeholder="Search & select a group"
              searchPlaceholder="Search by group name or code..."
              error={basicErrors.groupName}
              value={groupId}
              onChange={(id) => {
                const g = allGroups.find((grp: any) => grp.id === id);
                if (g) handleSelectGroup(g);
              }}
              options={allGroups.map((g: any) => ({
                value: g.id,
                label: g.groupName || g.name || "Unnamed group",
                sublabel: g.groupCode || undefined,
              }))}
            />

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
              <DatePicker
                value={familyHistoryDate ? new Date(familyHistoryDate) : undefined}
                onChange={(date) => {
                  setFamilyHistoryDate(date ? format(date, "yyyy-MM-dd") : "");
                  setBasicErrors((p) => ({ ...p, familyHistoryDate: "" }));
                }}
              />
              {basicErrors.familyHistoryDate && (
                <p className="text-xs text-red-500 mt-1">{basicErrors.familyHistoryDate}</p>
              )}
            </div>

            {/* Member Name — shadcn-style searchable dropdown */}
            <SearchableSelect
              label="Member Name"
              required
              placeholder={membersList.length === 0 ? "Select a group first" : "Search & select a member"}
              searchPlaceholder="Search members..."
              error={basicErrors.memberId}
              disabled={membersList.length === 0}
              value={memberId}
              onChange={(id) => {
                setMemberId(id);
                setBasicErrors((p) => ({ ...p, memberId: "" }));
              }}
              options={membersList.map((m) => ({
                value: m.id,
                label: getMemberFullName(m),
              }))}
            />
          </div>
        </SectionCard>

        {/* Card 2: Family History Records (relations grid) */}
        <SectionCard title="Family History Records">
          <FamilyHistoryRecordsEditor
            familyHistoryDate={familyHistoryDate}
            onFamilyHistoryDateChange={setFamilyHistoryDate}
            records={tempRecords}
            onChange={setTempRecords}
          />
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
            className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-gradient-to-r from-[#5c67ff] to-[#3a47ff] hover:brightness-110 disabled:bg-slate-400 text-white rounded-xl font-semibold text-sm shadow-md shadow-blue-200 transition-all cursor-pointer"
          >
            <Save size={15} />
            {isEditMode ? "Save Changes" : "Save Family History"}
          </button>
        </div>
      </form>
    </div>
  );
}