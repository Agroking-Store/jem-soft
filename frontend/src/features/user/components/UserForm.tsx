"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { Eye, EyeOff, User, Mail, Shield, ToggleLeft } from "lucide-react";
import toast from "react-hot-toast";

import type { AppDispatch, RootState } from "@/store/store";
import { createUser, updateUser } from "@/features/user/userSlice";
import type { ManagedUser, UserRole } from "@/features/user/types";

interface Props {
  mode: "create" | "edit";
  initialData?: ManagedUser;
}

interface FormState {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  isActive: boolean;
}

const ROLES: { value: UserRole; label: string; description: string }[] = [
  {
    value: "ADMIN",
    label: "Admin",
    description: "Full access including user management",
  },
  {
    value: "ADVISOR",
    label: "Advisor",
    description: "Can manage customers and policies",
  },
  {
    value: "VIEWER",
    label: "Viewer",
    description: "Read-only access to the system",
  },
];

export default function UserForm({ mode, initialData }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { isLoading } = useSelector((state: RootState) => state.userManagement);

  const [form, setForm] = useState<FormState>({
    name: initialData?.name ?? "",
    email: initialData?.email ?? "",
    password: "",
    role: (initialData?.role as UserRole) ?? "VIEWER",
    isActive: initialData?.isActive ?? true,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<
    Partial<Record<keyof FormState, string>>
  >({});

  const validate = (): boolean => {
    const e: Partial<Record<keyof FormState, string>> = {};

    if (!form.name.trim()) e.name = "Name is required";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "Enter a valid email address";

    if (mode === "create") {
      if (!form.password) e.password = "Password is required";
      else if (form.password.length < 6)
        e.password = "Minimum 6 characters required";
    }

    if (!form.role) e.role = "Please select a role";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]:
        type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));

    if (errors[name as keyof FormState]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      if (mode === "create") {
        await dispatch(
          createUser({
            name: form.name.trim(),
            email: form.email.trim().toLowerCase(),
            password: form.password,
            role: form.role,
          }),
        ).unwrap();
        toast.success("User created successfully");
      } else if (initialData) {
        await dispatch(
          updateUser({
            id: initialData.id,
            payload: {
              name: form.name.trim(),
              email: form.email.trim().toLowerCase(),
              role: form.role,
              isActive: form.isActive,
            },
          }),
        ).unwrap();
        toast.success("User updated successfully");
      }
      router.push("/dashboard/users");
    } catch (err: any) {
      toast.error(err ?? "Something went wrong");
    }
  };

  const fieldClass = (key: keyof FormState) =>
    `w-full rounded-xl border px-4 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 ${
      errors[key]
        ? "border-rose-300 bg-rose-50 focus:border-rose-400 focus:ring-2 focus:ring-rose-200"
        : "border-slate-200 bg-slate-50 focus:border-[#B8873A] focus:bg-white focus:ring-2 focus:ring-[#B8873A]/20"
    }`;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-5 flex items-center gap-2 text-base font-semibold text-slate-900">
          <User size={18} className="text-[#B8873A]" />
          Basic Information
        </h2>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {/* Name */}
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Enter full name"
              className={fieldClass("name")}
            />
            {errors.name && (
              <p className="mt-1.5 text-xs text-rose-600">{errors.name}</p>
            )}
          </div>

          {/* Email */}
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Email Address <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Mail
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="user@example.com"
                className={`${fieldClass("email")} pl-10`}
              />
            </div>
            {errors.email && (
              <p className="mt-1.5 text-xs text-rose-600">{errors.email}</p>
            )}
          </div>

          {/* Password — only on create */}
          {mode === "create" && (
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Minimum 6 characters"
                  className={`${fieldClass("password")} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs text-rose-600">
                  {errors.password}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Role & Access Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-5 flex items-center gap-2 text-base font-semibold text-slate-900">
          <Shield size={18} className="text-[#B8873A]" />
          Role & Access
        </h2>

        {/* Role selector */}
        <div className="space-y-3">
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            System Role <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {ROLES.map((r) => (
              <label
                key={r.value}
                className={`flex cursor-pointer flex-col gap-1 rounded-xl border p-4 transition-all ${
                  form.role === r.value
                    ? "border-[#B8873A] bg-[#B8873A]/5 ring-2 ring-[#B8873A]/20"
                    : "border-slate-200 bg-slate-50 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-900">
                    {r.label}
                  </span>
                  <input
                    type="radio"
                    name="role"
                    value={r.value}
                    checked={form.role === r.value}
                    onChange={handleChange}
                    className="accent-[#B8873A]"
                  />
                </div>
                <p className="text-xs text-slate-500">{r.description}</p>
              </label>
            ))}
          </div>
          {errors.role && (
            <p className="mt-1.5 text-xs text-rose-600">{errors.role}</p>
          )}
        </div>

        {/* Active toggle — only on edit */}
        {mode === "edit" && (
          <div className="mt-5 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex items-center gap-3">
              <ToggleLeft size={18} className="text-slate-500" />
              <div>
                <p className="text-sm font-medium text-slate-900">
                  Account Status
                </p>
                <p className="text-xs text-slate-500">
                  Inactive users cannot log in to the system
                </p>
              </div>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                name="isActive"
                checked={form.isActive}
                onChange={handleChange}
                className="peer sr-only"
              />
              <div className="peer h-6 w-11 rounded-full bg-slate-300 transition-colors peer-checked:bg-[#0B1220] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#B8873A]/20 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-all after:content-[''] peer-checked:after:translate-x-full" />
            </label>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => router.push("/dashboard/users")}
          className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-xl bg-[#0B1220] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#16294D] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading
            ? mode === "create"
              ? "Creating..."
              : "Saving..."
            : mode === "create"
              ? "Create User"
              : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
