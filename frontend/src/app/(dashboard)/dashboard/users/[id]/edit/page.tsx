"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/features/auth/hooks/useAuth";
import UserEditPage from "@/features/user/pages/UserEditPage";

export default function EditUserPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const [isMounted, setIsMounted] = useState(false);
  const userId = params?.id as string;

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

  return <UserEditPage userId={userId} />;
}
