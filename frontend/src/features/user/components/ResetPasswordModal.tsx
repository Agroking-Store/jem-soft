"use client";

import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { KeyRound, Eye, EyeOff, X } from "lucide-react";
import toast from "react-hot-toast";

import type { AppDispatch, RootState } from "@/store/store";
import { resetUserPassword } from "@/features/user/userSlice";
import type { ManagedUser } from "@/features/user/types";

interface Props {
  user: ManagedUser;
  onClose: () => void;
}

export default function ResetPasswordModal({ user, onClose }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading } = useSelector((state: RootState) => state.userManagement);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!newPassword) e.newPassword = "Password is required";
    else if (newPassword.length < 6)
      e.newPassword = "Minimum 6 characters required";
    if (!confirmPassword) e.confirmPassword = "Please confirm password";
    else if (newPassword !== confirmPassword)
      e.confirmPassword = "Passwords do not match";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      await dispatch(
        resetUserPassword({
          id: user.id,
          payload: { newPassword },
        }),
      ).unwrap();
      toast.success(`Password reset successfully for ${user.name}`);
      onClose();
    } catch (err: any) {
      toast.error(err ?? "Failed to reset password");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.28)]">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <KeyRound size={18} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                Reset Password
              </h3>
              <p className="text-sm text-slate-500">{user.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {/* New Password */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              New Password
            </label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className={`w-full rounded-xl border px-4 py-3 pr-10 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400
                  ${
                    errors.newPassword
                      ? "border-rose-300 bg-rose-50 focus:border-rose-400 focus:ring-2 focus:ring-rose-200"
                      : "border-slate-200 bg-slate-50 focus:border-[#B8873A] focus:bg-white focus:ring-2 focus:ring-[#B8873A]/20"
                  }`}
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.newPassword && (
              <p className="mt-1.5 text-xs text-rose-600">
                {errors.newPassword}
              </p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className={`w-full rounded-xl border px-4 py-3 pr-10 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400
                  ${
                    errors.confirmPassword
                      ? "border-rose-300 bg-rose-50 focus:border-rose-400 focus:ring-2 focus:ring-rose-200"
                      : "border-slate-200 bg-slate-50 focus:border-[#B8873A] focus:bg-white focus:ring-2 focus:ring-[#B8873A]/20"
                  }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="mt-1.5 text-xs text-rose-600">
                {errors.confirmPassword}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="rounded-xl bg-[#0B1220] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#16294D] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? "Resetting..." : "Reset Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
