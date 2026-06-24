"use client";

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { RootState, AppDispatch } from "@/store/store";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { fetchClient, updateClient } from "@/features/clients/clientSlice";
import { Input } from "@/shared/components/ui/Input";
import { Button } from "@/shared/components/ui/Button";
import { ArrowLeft, User, Building2, Mail, Phone, Lock, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

const editClientSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be less than 50 characters"),
  companyName: z.string().optional().or(z.literal("")),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please provide a valid email"),
  phone: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .max(15, "Phone number must be less than 15 digits"),
  password: z.string().optional().or(z.literal("")),
});

type EditClientValues = z.infer<typeof editClientSchema>;

export default function ClientEditPage() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const { user, isLoading: authLoading } = useAuth();
  const { currentClient, isLoading: clientLoading, error } = useSelector((s: RootState) => s.clients);

  const [showPassword, setShowPassword] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<EditClientValues>({
    resolver: zodResolver(editClientSchema),
    defaultValues: {
      name: "",
      companyName: "",
      email: "",
      phone: "",
      password: "",
    },
  });

  useEffect(() => {
    setIsMounted(true);
    if (id) {
      dispatch(fetchClient(id));
    }
  }, [dispatch, id]);

  useEffect(() => {
    if (currentClient && isMounted) {
      setValue("name", currentClient.name);
      setValue("companyName", currentClient.companyName || "");
      setValue("email", currentClient.email);
      setValue("phone", currentClient.phone);
    }
  }, [currentClient, setValue, isMounted]);

  useEffect(() => {
    if (isMounted && !authLoading && user) {
      if (user.role !== "ADMIN" && user.role !== "ADVISOR") {
        toast.error("You do not have permission to access this page.");
        router.replace("/dashboard/clients");
      }
    }
  }, [isMounted, authLoading, user, router]);

  const onSubmit = async (data: EditClientValues) => {
    setIsSubmitting(true);
    try {
      const payload: any = {
        name: data.name,
        companyName: data.companyName || null,
        email: data.email,
        phone: data.phone,
      };

      if (data.password && data.password.trim().length >= 6) {
        payload.password = data.password;
      }

      await dispatch(updateClient({ id, payload })).unwrap();
      toast.success("Client updated successfully");
      router.push("/dashboard/clients");
    } catch (err: any) {
      toast.error(err || "Failed to update client");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isMounted || authLoading || (clientLoading && !currentClient)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (user?.role !== "ADMIN" && user?.role !== "ADVISOR") {
    return null;
  }

  if (error && !currentClient) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16 px-4">
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Error Loading Client</h3>
        <p className="text-slate-500 mb-6">{error}</p>
        <Link
          href="/dashboard/clients"
          className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors"
        >
          Back to Clients
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back button */}
      <div>
        <Link
          href="/dashboard/clients"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Back to Clients</span>
        </Link>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Edit Client</h1>
        <p className="text-slate-500 text-sm mt-1">
          Modify details for client <span className="font-semibold text-slate-800">{currentClient?.name}</span>.
        </p>
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Input
              label="Full Name"
              type="text"
              placeholder="e.g. Rahul Sharma"
              icon={<User size={18} />}
              error={errors.name?.message}
              {...register("name")}
            />

            <Input
              label="Company Name (Optional)"
              type="text"
              placeholder="e.g. Sharma Enterprise"
              icon={<Building2 size={18} />}
              error={errors.companyName?.message}
              {...register("companyName")}
            />

            <Input
              label="Email Address"
              type="email"
              placeholder="e.g. rahul@example.com"
              icon={<Mail size={18} />}
              error={errors.email?.message}
              {...register("email")}
            />

            <Input
              label="Phone Number"
              type="text"
              placeholder="e.g. 9876543210"
              icon={<Phone size={18} />}
              error={errors.phone?.message}
              {...register("phone")}
            />
          </div>

          <div className="border-t border-slate-100 pt-6">
            <div className="relative">
              <Input
                label="New Portal Password (Optional)"
                type={showPassword ? "text" : "password"}
                placeholder="Leave blank to keep unchanged"
                icon={<Lock size={18} />}
                error={errors.password?.message}
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-[34px] text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Only enter a password if you wish to reset or change the client's current portal login password.
            </p>
          </div>

          <div className="flex items-center justify-end gap-4 border-t border-slate-100 pt-6">
            <Link
              href="/dashboard/clients"
              className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-lg transition-colors"
            >
              Cancel
            </Link>
            <Button
              type="submit"
              isLoading={isSubmitting}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm shadow-sm transition-all duration-200 w-auto"
            >
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
