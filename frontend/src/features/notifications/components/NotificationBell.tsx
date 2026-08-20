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
    showNotificationCount,
    fetchNotifications,
    readNotification,
    deleteNotification,
    hideNotificationCount,
  } = useNotificationStore();

  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);


  // Mark notification as read
  const handleNotificationClick = async (id: string) => {
  try {
    await readNotification(id);
    await fetchNotifications();

    setOpen(false);

    // ❌ Remove this line
    // router.push("/dashboard/notifications");
  } catch (error) {
    console.error("Failed to read notification:", error);
  }
};


  // Delete notification
  const handleDeleteNotification = async (id: string) => {
    try {
      await deleteNotification(id);
      await fetchNotifications();
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  };

  const handleBellClick = () => {
  hideNotificationCount();
};

  return (
    <div className="relative" onMouseEnter={() => setOpen(true)}
         onMouseLeave={() => setOpen(false)}>
      <button
        onClick={() => { router.push("/dashboard/notifications"); setOpen(false); handleBellClick();}}
        className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors"
      >
        <Bell size={22} className="text-slate-600" />

        {showNotificationCount && unreadCount > 0 && (
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

      <div className={`display : ${open ? "block" : "hidden"}`}>
        <NotificationDropdown
          notifications={notifications}
          onNotificationClick={handleNotificationClick}
          onDeleteNotification={handleDeleteNotification}
          onClose={() => setOpen(false)}
        />
      </div>
    </div>
  );
}