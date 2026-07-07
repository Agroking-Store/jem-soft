"use client";

import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useNotificationStore } from "@/store/notificationStore";
import NotificationDropdown from "./NotificationDropdown";

export default function NotificationBell() {
  const router = useRouter();

  const {
    notifications,
    unreadCount,
    fetchNotifications,
    readNotification,
  } = useNotificationStore();

  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleNotificationClick = async (id: string) => {
    try {
      await readNotification(id);

      // Refresh notifications so unread count stays correct
      await fetchNotifications();

      // Close dropdown
      setOpen(false);

      // For now open Notification Center
      router.push("/dashboard/notifications");
    } catch (error) {
      console.error("Failed to read notification:", error);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors"
      >
        <Bell size={22} className="text-slate-600" />

        {unreadCount > 0 && (
          <span
            className="
              absolute
              -top-1
              -right-1
              min-w-5
              h-5
              px-1
              flex
              items-center
              justify-center
              rounded-full
              bg-red-500
              text-white
              text-xs
              font-semibold
            "
          >
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <NotificationDropdown
  notifications={notifications}
  onNotificationClick={handleNotificationClick}
  onClose={() => setOpen(false)}
/>
      )}
    </div>
  );
}