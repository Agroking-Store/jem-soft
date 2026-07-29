"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/hooks/useAuth";
import UserCreatePage from "@/features/user/pages/UserCreatePage";

export default function NewUserPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && user?.role !== "ADMIN") {
      router.replace("/dashboard");
    }
  }, [isMounted, user, router]);

  if (!isMounted || user?.role !== "ADMIN") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-[#0B1220]" />
      </div>
    );
  }

  return <UserCreatePage />;
}
