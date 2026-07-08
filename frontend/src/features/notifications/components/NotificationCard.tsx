"use client";

import { Eye, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();

  const handleView = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!notification.policyId) {
      console.warn("No policyId found for this notification.");
      return;
    }

    // Mark notification as read
    onClick();

    // Navigate to the corresponding policy
   router.push(
  `/dashboard/lic/policies?highlight=${notification.policyId}&view=table`
);
  };

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
        ${notification.isRead ? "bg-white" : "bg-blue-50"}
      `}
    >
      {/* Notification Content */}
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

      {/* View Policy */}
      <button
        onClick={handleView}
        className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 hover:text-blue-700 transition-colors"
        title="View Policy"
      >
        <Eye size={18} />
      </button>

      {/* Delete Notification */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(notification.id);
        }}
        className="p-2 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
        title="Delete notification"
      >
        <Trash2 size={18} />
      </button>
    </div>
  );
}