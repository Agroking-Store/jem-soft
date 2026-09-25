"use client";

import { Bell } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useNotificationStore } from "@/store/notificationStore";
import NotificationDropdown from "./NotificationDropdown";

export default function NotificationBell() {
  const {
    notifications,
    unreadCount,
    showNotificationCount,
    fetchNotifications,
    readNotification,
    deleteNotification,
    markAllNotificationsRead,
    hideNotificationCount,
  } = useNotificationStore();

  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Handle outside click and Escape key to close the dropdown
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  // Toggle notification popup
  const handleToggle = () => {
    if (!open) {
      hideNotificationCount();
    }
    setOpen((prev) => !prev);
  };

  // Mark single notification as read
  const handleNotificationClick = async (id: string) => {
    try {
      await readNotification(id);
      await fetchNotifications();
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

  // Mark all notifications read
  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      await fetchNotifications();
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* YouTube Style Bell Icon Button */}
      <button
        type="button"
        onClick={handleToggle}
        aria-label="Open notifications"
        aria-expanded={open}
        className={`
          relative p-2.5 rounded-full transition-colors cursor-pointer select-none
          ${
            open
              ? "bg-zinc-200/80 text-zinc-900"
              : "text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100"
          }
        `}
      >
        <Bell size={21} strokeWidth={2} />

        {/* YouTube Red Notification Badge */}
        {showNotificationCount && unreadCount > 0 && (
          <span
            className="
              absolute
              -top-0.5
              -right-0.5
              min-w-[19px]
              h-[19px]
              px-1.5
              flex
              items-center
              justify-center
              rounded-full
              bg-[#cc0000]
              text-white
              text-[10.5px]
              font-bold
              border-2
              border-white
              shadow-sm
            "
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Floating Dropdown */}
      {open && (
        <NotificationDropdown
          notifications={notifications}
          onNotificationClick={handleNotificationClick}
          onDeleteNotification={handleDeleteNotification}
          onMarkRead={handleNotificationClick}
          onMarkAllRead={handleMarkAllRead}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}