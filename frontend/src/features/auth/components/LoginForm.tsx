"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { Mail, Lock, Eye } from "lucide-react";
import { Input } from "@/shared/components/ui/Input";
import { Button } from "@/shared/components/ui/Button";
import { useAuth } from "../hooks/useAuth";

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export const LoginForm = () => {
  const { login, isLoading } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  return (
    <div className="bg-card border border-slate-800 p-10 rounded-2xl shadow-2xl">
      <div className="mb-8 text-left">
        <h2 className="text-3xl font-bold text-white">Welcome Back</h2>
        <p className="text-gray-400 mt-2 text-sm">
          Sign in to continue to JEM.
        </p>
      </div>

      <form onSubmit={handleSubmit(login)} className="space-y-5">
        <Input
          label="Email or Username"
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
            className="absolute right-3 top-9.5 text-gray-500 hover:text-white"
          >
            <Eye size={18} />
          </button>
        </div>

        <Button type="submit" isLoading={isLoading} className="mt-4 text-lg">
          Sign In
        </Button>

        <p className="text-sm text-center text-gray-400 pt-4">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="text-white hover:text-brand-blue font-semibold"
          >
            Create Account
          </Link>
        </p>
      </form>
    </div>
  );
};
