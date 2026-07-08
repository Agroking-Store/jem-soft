"use client";

import { Trash2 } from "lucide-react";
import { Notification } from "../types";

interface NotificationCardProps {
  notification: Notification;
  onClick: () => void;
  onDelete: (id: string) => void;
}

export default function NotificationCard({
  notification,
  onClick,
  onDelete,
}: NotificationCardProps) {
  return (
    <div
      className={`
        flex
        items-start
        justify-between
        gap-3
        px-4
        py-3
        border-b
        transition
        ${
          notification.isRead
            ? "bg-white"
            : "bg-blue-50"
        }
      `}
    >
      {/* Clickable Notification */}
      <button
        onClick={onClick}
        className="flex-1 text-left hover:bg-slate-50 rounded-md p-1"
      >
        <div className="flex items-center gap-2">
          {!notification.isRead && (
            <div className="w-2 h-2 rounded-full bg-blue-600"></div>
          )}

          <h4
            className={
              notification.isRead
                ? "font-medium"
                : "font-semibold"
            }
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
      </button>

      {/* Delete Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(notification.id);
        }}
        className="
          p-2
          rounded-lg
          text-red-500
          hover:bg-red-50
          transition-colors
        "
        title="Delete notification"
      >
        <Trash2 size={18} />
      </button>
    </div>
  );
}