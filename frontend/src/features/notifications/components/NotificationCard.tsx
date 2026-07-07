"use client";

import { Notification } from "../types";

interface NotificationCardProps {
  notification: Notification;
  onClick: () => void;
}

export default function NotificationCard({
  notification,
  onClick,
}: NotificationCardProps) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full
        text-left
        px-4
        py-3
        border-b
        transition
        hover:bg-slate-50
        ${
          notification.isRead
            ? "bg-white"
            : "bg-blue-50"
        }
      `}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">

          <div className="flex items-center gap-2">

            {!notification.isRead && (
              <div className="w-2 h-2 rounded-full bg-blue-600"></div>
            )}

            <h4
              className={`${
                notification.isRead
                  ? "font-medium"
                  : "font-semibold"
              }`}
            >
              {notification.title}
            </h4>

          </div>

          <p className="text-sm text-slate-600 mt-1">
            {notification.message}
          </p>

          <p className="text-xs text-slate-400 mt-2">
            {new Date(notification.createdAt).toLocaleString()}
          </p>

        </div>
      </div>
    </button>
  );
}