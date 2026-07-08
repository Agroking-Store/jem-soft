"use client";

import { useEffect } from "react";
import { Trash2 } from "lucide-react";

import { useNotificationStore } from "@/store/notificationStore";
import NotificationCard from "@/features/notifications/components/NotificationCard";

export default function NotificationsPage() {
  const {
    notifications,
    fetchNotifications,
    readNotification,
    deleteNotification,
    deleteReadNotifications,
  } = useNotificationStore();

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const unreadNotifications = notifications.filter(
    (notification) => !notification.isRead
  );

  const readNotifications = notifications.filter(
    (notification) => notification.isRead
  );

  const handleNotificationClick = async (id: string) => {
    await readNotification(id);
    await fetchNotifications();
  };

  const handleDeleteNotification = async (id: string) => {
    await deleteNotification(id);
    await fetchNotifications();
  };

  const handleDeleteAllRead = async () => {
    const confirmed = window.confirm(
      "Delete all read notifications?"
    );

    if (!confirmed) return;

    await deleteReadNotifications();
    await fetchNotifications();
  };

  return (
    <div className="mx-auto max-w-5xl p-6">

      {/* Header */}

      <div className="mb-8 flex items-center justify-between">

        <div>

          <h1 className="text-3xl font-bold text-slate-900">
            Notifications
          </h1>

          <p className="mt-1 text-slate-500">
            View and manage all notifications.
          </p>

        </div>

        {readNotifications.length > 0 && (
          <button
            onClick={handleDeleteAllRead}
            className="
              flex
              items-center
              gap-2
              rounded-lg
              bg-red-500
              px-4
              py-2
              text-white
              hover:bg-red-600
              transition
            "
          >
            <Trash2 size={18} />
            Delete All Read
          </button>
        )}

      </div>

      {/* Empty State */}

      {notifications.length === 0 && (
        <div className="rounded-xl border bg-white p-16 text-center">

          <h2 className="text-xl font-semibold">
            No notifications
          </h2>

          <p className="mt-2 text-slate-500">
            Policy activities will appear here.
          </p>

        </div>
      )}

      {/* Unread */}

      {unreadNotifications.length > 0 && (
        <div className="mb-8">

          <h2 className="mb-4 text-lg font-semibold text-blue-600">
            Unread ({unreadNotifications.length})
          </h2>

          <div className="overflow-hidden rounded-xl border bg-white shadow-sm">

            {unreadNotifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                onClick={() =>
                  handleNotificationClick(notification.id)
                }
                onDelete={handleDeleteNotification}
              />
            ))}

          </div>

        </div>
      )}

      {/* Read */}

      {readNotifications.length > 0 && (
        <div>

          <h2 className="mb-4 text-lg font-semibold text-slate-600">
            Read ({readNotifications.length})
          </h2>

          <div className="overflow-hidden rounded-xl border bg-white shadow-sm">

            {readNotifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                onClick={() =>
                  handleNotificationClick(notification.id)
                }
                onDelete={handleDeleteNotification}
              />
            ))}

          </div>

        </div>
      )}

    </div>
  );
}