"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { Input } from "@/shared/components/ui/Input";
import { Button } from "@/shared/components/ui/Button";
import { useAuth } from "../hooks/useAuth";

const registerSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be less than 50 characters"),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please provide a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export const RegisterForm = () => {
  const { register: registerUser, isLoading } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormValues) => {
    await registerUser(data);
  };

  return (
    <div className="bg-white border border-slate-200 p-10 rounded-2xl shadow-lg">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4 w-full"
        noValidate
      >
        <Input
          label="Full Name"
          type="text"
          placeholder="John Doe"
          error={errors.name?.message}
          {...register("name")}
        />

        <Input
          label="Email Address"
          type="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register("email")}
        />

        <Input
          label="Password"
          type="password"
          placeholder="••••••••"
          error={errors.password?.message}
          {...register("password")}
        />

        <Button type="submit" isLoading={isLoading} className="mt-2">
          Create Account
        </Button>

        <p className="text-sm text-center text-slate-500 pt-4">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            Sign In
          </Link>
        </p>
      </form>
    </div>
  );
};