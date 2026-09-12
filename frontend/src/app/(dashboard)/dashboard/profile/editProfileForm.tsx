"use client";

import { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { updateProfile } from "@/features/user/user";
import type { User } from "@/features/auth/types";
import { updateUser } from "@/features/auth/authSlice";
import toast from "react-hot-toast";
import { Button } from "@/shared/components/ui/Button";
import z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { User as UserIcon, Mail, Shield, Edit2, CheckCircle2, X } from "lucide-react";

export default function EditProfileForm({
  user,
}: {
  user: User;
}) {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const userSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.email("Invalid email address"),
    role: z.string().min(1, "Role is required"),
  });

  type UserFormValues = z.infer<typeof userSchema>;

  const { reset, register, handleSubmit, formState: { errors } } = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      role: user?.role || "",
    },
  });

  useEffect(() => {
    if (user) {
      reset({
        name: user.name,
        email: user.email,
        role: user.role,
      });
    }
  }, [user, reset]);

  const onSubmit = async (data: UserFormValues) => {
    setLoading(true);
    try {
      const response = await updateProfile({
        name: data.name,
        email: data.email,
      });

      const updatedUser = response.user;
      dispatch(updateUser(updatedUser));
      toast.success("Profile Updated successfully!");
      setIsEditing(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-blue-100 bg-[#f0f7ff] p-5 shadow-sm mb-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-[#1e3a8a] to-[#2563eb] text-white shadow-lg shadow-blue-200/50">
            <UserIcon size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">
              Profile
            </h1>
            <p className="mt-0.5 text-sm font-medium text-slate-500">
              Manage your personal information and preferences.
            </p>
          </div>
        </div>
        <Button
          onClick={() => setIsEditing(true)}
          className="bg-gradient-to-r from-[#5c67ff] to-[#3a47ff] hover:brightness-110 active:scale-[0.98] text-white font-semibold flex items-center gap-2 rounded-xl shadow-md shadow-blue-200 px-5 py-2.5 transition-all"
        >
          <Edit2 className="w-4 h-4" />
          Edit Profile
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Name Card */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#1877F2] via-[#1877F2]/40 to-transparent" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm font-semibold mb-1 tracking-wide">Name</p>
              <p className="text-slate-900 text-xl font-bold truncate pr-2">{user?.name || "User"}</p>
            </div>
            <div className="flex shrink-0 w-12 h-12 items-center justify-center bg-blue-50 text-[#1877F2] rounded-xl group-hover:bg-[#1877F2] group-hover:text-white transition-colors">
              <UserIcon className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Email Card */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#1877F2] via-[#1877F2]/40 to-transparent" />
          <div className="flex items-center justify-between overflow-hidden">
            <div className="overflow-hidden">
              <p className="text-slate-500 text-sm font-semibold mb-1 tracking-wide">Email</p>
              <p className="text-slate-900 text-lg font-bold truncate pr-2" title={user?.email}>{user?.email || "No Email"}</p>
            </div>
            <div className="flex shrink-0 w-12 h-12 items-center justify-center bg-blue-50 text-[#1877F2] rounded-xl group-hover:bg-[#1877F2] group-hover:text-white transition-colors">
              <Mail className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Role Card */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#1877F2] via-[#1877F2]/40 to-transparent" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm font-semibold mb-1 tracking-wide">Role</p>
              <p className="text-slate-900 text-xl font-bold uppercase">{user?.role || "GUEST"}</p>
            </div>
            <div className="flex shrink-0 w-12 h-12 items-center justify-center bg-blue-50 text-[#1877F2] rounded-xl group-hover:bg-[#1877F2] group-hover:text-white transition-colors">
              <Shield className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Account Details Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/70">
          <h2 className="text-[#0f172a] font-bold tracking-[0.14em] text-[11px] mb-1 uppercase">Account Details</h2>
          <p className="text-slate-500 text-sm">More details about your account and activity.</p>
        </div>
        <div className="p-0 overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[500px]">
            <thead>
              <tr className="border-b border-slate-100 bg-white">
                <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider w-[40%]">Property</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider w-[60%]">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-4 px-6 flex items-center gap-3">
                  <div className="flex shrink-0 items-center justify-center w-8 h-8 bg-blue-50 text-[#1877F2] rounded-lg shadow-sm">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium text-slate-700">Account Status</span>
                </td>
                <td className="py-4 px-6">
                  <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-600 border border-emerald-200/50 px-3 py-1 rounded-full text-xs font-semibold tracking-wide">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Active
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-4 px-6 flex items-center gap-3">
                  <div className="flex shrink-0 items-center justify-center w-8 h-8 bg-blue-50 text-[#1877F2] rounded-lg shadow-sm">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium text-slate-700">Account Type</span>
                </td>
                <td className="py-4 px-6">
                  <span className="text-sm text-slate-600 font-medium capitalize">
                    {user?.role?.toLowerCase().replace("_", " ") || "User"}
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-4 px-6 flex items-center gap-3">
                  <div className="flex shrink-0 items-center justify-center w-8 h-8 bg-blue-50 text-[#1877F2] rounded-lg shadow-sm">
                    <Mail className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium text-slate-700">Contact Email</span>
                </td>
                <td className="py-4 px-6">
                  <span className="text-sm text-slate-600 font-medium">{user?.email || "N/A"}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-white p-8 rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.2)] border border-slate-100 relative animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setIsEditing(false)}
              className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900">Edit Profile</h2>
              <p className="text-sm text-slate-500 mt-1">Update your account information</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Name</label>
                <input
                  className="w-full border border-slate-200 rounded-xl text-sm p-3 transition-all outline-none text-slate-900 focus:ring-2 focus:ring-[#0B1220]/20 focus:border-[#0B1220] placeholder:text-slate-400"
                  {...register("name")}
                  autoFocus
                />
                {errors.name && <p className="text-xs text-red-500 mt-1.5">{errors.name.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                <input
                  className="w-full border border-slate-200 rounded-xl text-sm p-3 transition-all outline-none text-slate-900 focus:ring-2 focus:ring-[#0B1220]/20 focus:border-[#0B1220] placeholder:text-slate-400"
                  {...register("email")}
                />
                {errors.email && <p className="text-xs text-red-500 mt-1.5">{errors.email.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Role (Cannot be changed)</label>
                <input
                  className="w-full border border-slate-200 rounded-xl text-sm p-3 transition-all outline-none text-slate-500 bg-slate-50 cursor-not-allowed"
                  {...register("role")}
                  disabled={true}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full border-slate-200 hover:bg-slate-50 text-slate-700 px-6 py-2"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="rounded-full bg-gradient-to-r from-[#5c67ff] to-[#3a47ff] hover:brightness-110 active:scale-[0.98] text-white font-semibold px-6 py-2 min-w-[120px] transition-all shadow-md shadow-blue-200"
                >
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
