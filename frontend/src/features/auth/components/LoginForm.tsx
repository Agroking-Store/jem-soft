"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { Input } from "@/shared/components/ui/Input";
import { Button } from "@/shared/components/ui/Button";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "@/store/store";
import { loginUser } from "@/features/auth/authSlice";
import { loginPortalCustomer } from "@/features/customers/customerSlice";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useState } from "react";

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export const LoginForm = () => {
  const { isLoading } = useAuth();
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsSubmitting(true);
    try {
      // Try system user login first
      const result = await dispatch(loginUser(data));
      if (loginUser.fulfilled.match(result)) {
        const user = result.payload.data.user;
        toast.success(`Welcome back, ${user.name}!`);
        router.push("/dashboard");
        return;
      }

      // If system login fails, try customer portal login
      const customerResult = await dispatch(loginPortalCustomer({ email: data.email, password: data.password }));
      if (loginPortalCustomer.fulfilled.match(customerResult)) {
        const customer = customerResult.payload.data.customer;
        toast.success(`Welcome, ${customer.name}!`);
        router.push("/customer-portal");
        return;
      }

      // Both failed
      toast.error("Invalid email or password");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg sm:p-10">
      <div className="mb-8 text-left">
        <h2 className="text-3xl font-bold text-slate-900">Welcome Back</h2>
        <p className="text-slate-500 mt-2 text-sm">
          Sign in to continue to JEM Soft.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Input
          label="Email Address"
          placeholder="name@company.com"
          icon={<Mail size={18} />}
          error={errors.email?.message}
          {...register("email")}
        />

        <div className="relative">
          <Input
            label="Password"
            type={isPasswordVisible ? "text" : "password"}
            placeholder="••••••••"
            icon={<Lock size={18} />}
            error={errors.password?.message}
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setIsPasswordVisible((isVisible) => !isVisible)}
            className="absolute right-2 top-7 flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B8873A]"
            aria-label={isPasswordVisible ? "Hide password" : "Show password"}
          >
            {isPasswordVisible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
          </button>
        </div>

        <Button type="submit" isLoading={isLoading || isSubmitting} className="mt-4 min-h-12 w-full text-base">
          Sign In
        </Button>

        <p className="text-sm text-center text-slate-500 pt-4">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="text-blue-600 hover:text-blue-700 font-semibold transition-colors"
          >
            Create Account
          </Link>
        </p>
      </form>
    </div>
  );
};
