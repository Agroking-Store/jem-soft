import { useFormContext, Controller } from "react-hook-form";
import Link from "next/link";
import { Plus, User } from "lucide-react";
import { CustomerSectionCard } from "@/features/customers/components/CustomerUi";
import { GroupAutoComplete, LifeAssuredAutoComplete } from "./AutoCompleteSelects";
import type { PolicyFormValues } from "../schema";

export function PolicyHolderSection({
  groups,
  groupMembers,
  selectedGroup,
  attributeHintsAge,
}: {
  groups: any[];
  groupMembers: any[];
  selectedGroup: any;
  attributeHintsAge?: string;
}) {
  const { register, control, watch, formState: { errors } } = useFormContext<PolicyFormValues>();
  const watchGroupId = watch("groupId");
  const watchGender = watch("gender");

  return (
    <CustomerSectionCard
      title="Policy Holder's Details"
      icon={User}
      actions={
        <Link
          href="/dashboard/customers/new"
          target="_blank"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
        >
          <Plus size={14} />
          New Group
        </Link>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <Controller
            name="groupId"
            control={control}
            render={({ field }) => (
              <GroupAutoComplete
                value={field.value}
                onChange={field.onChange}
                groups={groups}
              />
            )}
          />
          {errors.groupId && (
            <p className="text-xs text-red-500 mt-1">
              {errors.groupId.message}
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Group Code
          </label>
          <input
            type="text"
            value={selectedGroup?.groupCode || ""}
            placeholder="Autofilled"
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-500 cursor-not-allowed"
            readOnly
          />
        </div>
        <div>
          <Controller
            name="lifeAssuredId"
            control={control}
            render={({ field }) => (
              <LifeAssuredAutoComplete
                label="Life Assured"
                required
                value={field.value}
                onChange={field.onChange}
                members={groupMembers}
                disabled={!watchGroupId || groupMembers.length === 0}
                placeholder={
                  watchGroupId
                    ? groupMembers.length > 0
                      ? "Search member..."
                      : "No members in group"
                    : "Select a group first"
                }
                error={errors.lifeAssuredId?.message}
              />
            )}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Date of Birth
          </label>
          <input
            {...register("dob")}
            type="date"
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-500 cursor-not-allowed"
            readOnly
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Age
          </label>
          <input
            {...register("age")}
            type="number"
            placeholder="Autofilled"
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-500 cursor-not-allowed"
            readOnly
          />
          {attributeHintsAge && (
            <p className="text-xs text-slate-500 mt-1">
              {attributeHintsAge}
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Gender
          </label>
          <select
            {...register("gender")}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-500 cursor-not-allowed"
            disabled
          >
            <option value="">Select Gender</option>
            <option value={watchGender} disabled>
              {watchGender}
            </option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            PAN Regi.
          </label>
          <input
            {...register("pan")}
            type="text"
            placeholder="Autofilled"
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-500 cursor-not-allowed"
            readOnly
          />
        </div>
      </div>
    </CustomerSectionCard>
  );
}
