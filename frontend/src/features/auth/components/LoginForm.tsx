"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { Mail, Lock, Eye } from "lucide-react";
import { Input } from "@/shared/components/ui/Input";
import { Button } from "@/shared/components/ui/Button";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "@/store/store";
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
  const { login, isLoading } = useAuth();
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      const result = await dispatch(
        (await import("@/features/auth/authSlice")).loginUser(data)
      );
      if ((await import("@/features/auth/authSlice")).loginUser.fulfilled.match(result)) {
        const user = (result.payload as any).data.user;
        toast.success(`Welcome back, ${user.name}!`);
        router.push("/dashboard");
        return;
      }

      // If system login fails, try customer portal login
      const customerResult = await dispatch(loginPortalCustomer({ email: data.email, password: data.password }));
      if (loginPortalCustomer.fulfilled.match(customerResult)) {
        const customer = (customerResult.payload as any).data.customer;
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
    <div className="bg-white border border-slate-200 p-10 rounded-2xl shadow-lg">
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
            type="password"
            placeholder="••••••••"
            icon={<Lock size={18} />}
            error={errors.password?.message}
            {...register("password")}
          />
          <button
            type="button"
            className="absolute right-3 top-9 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <Eye size={18} />
          </button>
        </div>

        <Button type="submit" isLoading={isLoading || isSubmitting} className="mt-4 text-lg">
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