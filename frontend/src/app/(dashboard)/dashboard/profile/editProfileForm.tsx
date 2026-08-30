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
import { User as UserIcon, Mail, Shield, CheckCircle2, Edit2, ShieldAlert } from "lucide-react";

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

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UserFormValues>({
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

  if (isEditing) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0B1220] text-[#E8C77A]">
              <Edit2 size={18} />
            </span>
            <span>
              <h1 className="text-2xl font-serif font-semibold tracking-tight text-slate-900">
                Edit Profile
              </h1>
            </span>
          </div>
        </div>

        <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
          <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#B8873A]/40 to-transparent"></div>
          <div className="flex flex-col gap-4 border-b border-slate-200 bg-slate-50/90 px-5 py-4">
            <h2 className="font-serif text-sm font-semibold uppercase tracking-[0.18em] text-slate-700">
              Profile Details
            </h2>
            <p className="block mt-1 text-sm text-slate-500">
              Update your personal information.
            </p>
          </div>
          
          <div className="p-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <input
                  className={`w-full border rounded-xl text-sm p-3 transition-all
                    outline-none border-slate-200 text-slate-900
                    focus:border-[#0B1220] focus:ring-1 focus:ring-[#0B1220]
                    placeholder:text-slate-400`}
                  {...register("name")}
                />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1 mt-5">Email</label>
                <input
                  className={`w-full border rounded-xl text-sm p-3 transition-all
                    outline-none border-slate-200 text-slate-900
                    focus:border-[#0B1220] focus:ring-1 focus:ring-[#0B1220]
                    placeholder:text-slate-400`}
                  {...register("email")}
                />
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1 mt-5">Role</label>
                <input
                  className={`w-full border rounded-xl text-sm p-3 transition-all
                    outline-none border-slate-200 text-slate-900
                    bg-slate-100 text-slate-500 cursor-not-allowed`}
                  {...register("role")}
                  disabled={true}
                />
              </div>

              <div className="flex gap-4 mt-8 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
                  onClick={() => {
                    setIsEditing(false);
                    reset({ name: user?.name || "", email: user?.email || "", role: user?.role || "" });
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-[#0B1220] hover:bg-[#16294D] text-[#E8C77A] shadow-sm shadow-[#0B1220]/20"
                >
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0B1220] text-[#E8C77A]">
            <UserIcon size={20} />
          </span>
          <span>
            <h1 className="text-2xl font-serif font-semibold tracking-tight text-slate-900">
              Profile
            </h1>
          </span>
        </div>
        <button
          onClick={() => setIsEditing(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-[#0B1220] px-4 py-2.5 text-sm font-semibold text-[#E8C77A] shadow-sm shadow-[#0B1220]/20 transition-colors hover:bg-[#16294D] cursor-pointer"
        >
          <Edit2 size={18} />
          Edit Profile
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-r from-[#0B1220] via-[#132342] to-[#16294D] p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-md text-[#E8C77A] font-bold">
                Name
              </p>
              <p className="text-2xl font-bold text-[#E8C77A] mt-1">
                {user?.name || "User"}
              </p>
            </div>
            <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center border border-[#B8873A]/20">
              <UserIcon className="w-6 h-6 text-[#E8C77A]" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-[#0B1220] via-[#132342] to-[#16294D] p-6 rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="overflow-hidden">
              <p className="text-md text-[#E8C77A] font-bold">
                Email
              </p>
              <p className="text-xl font-bold text-[#E8C77A] mt-1 truncate" title={user?.email}>
                {user?.email}
              </p>
            </div>
            <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center border border-[#B8873A]/20 shrink-0 ml-4">
              <Mail className="w-6 h-6 text-[#E8C77A]" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-[#0B1220] via-[#132342] to-[#16294D] p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-md text-[#E8C77A] font-bold">
                Role
              </p>
              <p className="text-2xl font-bold text-[#E8C77A] mt-1 uppercase text-lg tracking-wider">
                {user?.role || "ADMIN"}
              </p>
            </div>
            <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center border border-[#B8873A]/20">
              <ShieldAlert className="w-6 h-6 text-[#E8C77A]" />
            </div>
          </div>
        </div>
      </div>

      <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#B8873A]/40 to-transparent"></div>
        <div className="flex flex-col gap-4 border-b border-slate-200 bg-slate-50/90 px-5 py-4">
          <h2 className="font-serif text-sm font-semibold uppercase tracking-[0.18em] text-slate-700">
            Account Details
          </h2>
          <p className="block mt-1 text-sm text-slate-500">
            More details about your account and activity.
          </p>
        </div>
        
        <div className="bg-white">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-medium">Property</th>
                <th className="px-6 py-4 font-medium">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-medium text-slate-700 flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0B1220] text-[#E8C77A]">
                    <CheckCircle2 size={16} />
                  </span>
                  Account Status
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200/50">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
                    Active
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-medium text-slate-700 flex items-center gap-3">
                   <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0B1220] text-[#E8C77A]">
                    <UserIcon size={16} />
                  </span>
                  Account Type
                </td>
                <td className="px-6 py-4 text-slate-600 font-medium">
                  {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase() : "Admin"} User
                </td>
              </tr>
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-medium text-slate-700 flex items-center gap-3">
                   <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0B1220] text-[#E8C77A]">
                    <Mail size={16} />
                  </span>
                  Contact Email
                </td>
                <td className="px-6 py-4 text-slate-600 font-medium">
                  {user?.email}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
