"use client";

import { useEffect } from "react";
import { useNotificationStore } from "@/store/notificationStore";
import NotificationCard from "@/features/notifications/components/NotificationCard";

export default function NotificationsPage() {
  const {
    notifications,
    fetchNotifications,
    readNotification,
  } = useNotificationStore();

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleNotificationClick = async (id: string) => {
    await readNotification(id);

    // Refresh list after marking as read
    await fetchNotifications();
  };

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Notifications
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            View all your notifications.
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        {notifications.length === 0 ? (
          <div className="p-10 text-center text-slate-500">
            No notifications available.
          </div>
        ) : (
          notifications.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              onClick={() => handleNotificationClick(notification.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}