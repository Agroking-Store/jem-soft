"use client";

import { useRouter } from "next/navigation";
import { Notification } from "../types";

import NotificationCard from "./NotificationCard";

interface NotificationDropdownProps {
  notifications: Notification[];
  onNotificationClick: (id: string) => void;
  onClose: () => void;
}

export default function NotificationDropdown({
  notifications,
  onNotificationClick,
  onClose,
}: NotificationDropdownProps) {

  const router = useRouter();

  return (
    <div
      className="
        absolute
        right-0
        top-full
        mt-2
        w-96
        bg-white
        rounded-xl
        border
        shadow-xl
        z-50
        overflow-hidden
      "
    >
      {/* Header */}
      <div className="px-4 py-3 border-b bg-slate-50">
        <h3 className="font-semibold text-slate-800">
          Notifications
        </h3>
      </div>

      {/* Notification List */}
      {notifications.length === 0 ? (
        <div className="p-6 text-center text-slate-500">
          No notifications found.
        </div>
      ) : (
        <div className="max-h-96 overflow-y-auto">
          {notifications.slice(0, 5).map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              onClick={() => onNotificationClick(notification.id)}
            />
          ))}
        </div>
      )}

      {/* Footer */}
      <button
        onClick={() => {
          onClose();
          router.push("/dashboard/notifications");
        }}
        className="
          w-full
          text-center
          py-3
          font-medium
          text-blue-600
          hover:bg-slate-50
          border-t
          transition-colors
        "
      >
        View All Notifications →
      </button>
    </div>
  );
}