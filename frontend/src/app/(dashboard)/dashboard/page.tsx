"use client";

import { useAuth } from "@/features/auth/hooks/useAuth";

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        Welcome, {user?.name}
      </h1>
      <p className="text-gray-500 mb-8">
        You are signed in as{" "}
        <span className="font-medium text-blue-600">{user?.role}</span>
      </p>
    </div>
  );
}
