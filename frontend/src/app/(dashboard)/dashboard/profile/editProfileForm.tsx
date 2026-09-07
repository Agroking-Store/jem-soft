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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-[#0B1220] p-2.5 rounded-xl">
            <UserIcon className="w-6 h-6 text-[#E8C77A]" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Profile</h1>
        </div>
        <Button
          onClick={() => setIsEditing(true)}
          className="bg-[#0B1220] hover:bg-[#132342] text-[#E8C77A] font-semibold flex items-center gap-2 rounded-lg px-5 py-2.5 transition-colors"
        >
          <Edit2 className="w-4 h-4" />
          Edit Profile
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Name Card */}
        <div className="bg-gradient-to-r from-[#0B1220] via-[#132342] to-[#16294D] p-6 rounded-xl shadow-md border border-slate-800 flex items-center justify-between group hover:shadow-lg transition-all">
          <div>
            <p className="text-[#E8C77A]/80 text-sm font-semibold mb-1 tracking-wide">Name</p>
            <p className="text-[#E8C77A] text-xl font-bold truncate pr-2">{user?.name || "User"}</p>
          </div>
          <div className="p-3 border border-[#E8C77A]/20 rounded-xl bg-white/5 group-hover:bg-white/10 transition-colors">
            <UserIcon className="w-6 h-6 text-[#E8C77A]" />
          </div>
        </div>

        {/* Email Card */}
        <div className="bg-gradient-to-r from-[#0B1220] via-[#132342] to-[#16294D] p-6 rounded-xl shadow-md border border-slate-800 flex items-center justify-between group hover:shadow-lg transition-all">
          <div className="overflow-hidden">
            <p className="text-[#E8C77A]/80 text-sm font-semibold mb-1 tracking-wide">Email</p>
            <p className="text-[#E8C77A] text-lg font-bold truncate pr-2" title={user?.email}>{user?.email || "No Email"}</p>
          </div>
          <div className="p-3 border border-[#E8C77A]/20 rounded-xl bg-white/5 group-hover:bg-white/10 transition-colors shrink-0">
            <Mail className="w-6 h-6 text-[#E8C77A]" />
          </div>
        </div>

        {/* Role Card */}
        <div className="bg-gradient-to-r from-[#0B1220] via-[#132342] to-[#16294D] p-6 rounded-xl shadow-md border border-slate-800 flex items-center justify-between group hover:shadow-lg transition-all">
          <div>
            <p className="text-[#E8C77A]/80 text-sm font-semibold mb-1 tracking-wide">Role</p>
            <p className="text-[#E8C77A] text-xl font-bold uppercase">{user?.role || "GUEST"}</p>
          </div>
          <div className="p-3 border border-[#E8C77A]/20 rounded-xl bg-white/5 group-hover:bg-white/10 transition-colors">
            <Shield className="w-6 h-6 text-[#E8C77A]" />
          </div>
        </div>
      </div>

      {/* Account Details Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-5 border-b-2 border-b-[#E8C77A]/40 bg-slate-50/30">
          <h2 className="text-[#132342] font-bold tracking-[0.1em] text-sm mb-1 uppercase">Account Details</h2>
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
                  <div className="bg-[#0B1220] p-1.5 rounded-lg shadow-sm">
                    <CheckCircle2 className="w-4 h-4 text-white" />
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
                  <div className="bg-[#0B1220] p-1.5 rounded-lg shadow-sm">
                    <UserIcon className="w-4 h-4 text-white" />
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
                  <div className="bg-[#0B1220] p-1.5 rounded-lg shadow-sm">
                    <Mail className="w-4 h-4 text-white" />
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
                  className="rounded-full bg-[#0B1220] hover:bg-[#132342] text-[#E8C77A] font-semibold px-6 py-2 min-w-[120px] transition-colors"
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
