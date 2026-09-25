"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  CheckCheck, 
  Settings, 
  Bell, 
  ArrowRight,
  Sparkles
} from "lucide-react";
import { Notification } from "../types";
import NotificationCard from "./NotificationCard";

interface NotificationDropdownProps {
  notifications: Notification[];
  onNotificationClick: (id: string) => void;
  onDeleteNotification: (id: string) => void;
  onMarkRead?: (id: string) => void;
  onMarkAllRead?: () => void;
  onClose: () => void;
}

export default function NotificationDropdown({
  notifications,
  onNotificationClick,
  onDeleteNotification,
  onMarkRead,
  onMarkAllRead,
  onClose,
}: NotificationDropdownProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const unreadNotifications = notifications.filter((n) => !n.isRead);
  const displayedNotifications =
    filter === "unread" ? unreadNotifications : notifications;

  const handleOpenPage = () => {
    onClose();
    router.push("/dashboard/notifications");
  };

  return (
    <div
      className="
        absolute
        right-0
        top-full
        mt-2
        w-[440px]
        max-w-[calc(100vw-2rem)]
        bg-white
        rounded-2xl
        border
        border-zinc-200/90
        shadow-2xl
        z-50
        overflow-hidden
        animate-in fade-in zoom-in-95 duration-150
      "
    >
      {/* YouTube Style Top Header */}
      <div className="px-4 pt-3.5 pb-2 border-b border-zinc-100 bg-white">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-zinc-900 tracking-tight">
              Notifications
            </h3>
            {unreadNotifications.length > 0 && (
              <span className="px-2 py-0.5 text-[11px] font-semibold bg-red-100 text-[#cc0000] rounded-full">
                {unreadNotifications.length} new
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {unreadNotifications.length > 0 && onMarkAllRead && (
              <button
                type="button"
                onClick={onMarkAllRead}
                title="Mark all as read"
                className="p-1.5 rounded-full text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                <CheckCheck size={18} />
              </button>
            )}

            <button
              type="button"
              onClick={handleOpenPage}
              title="Notification settings & history"
              className="p-1.5 rounded-full text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
            >
              <Settings size={18} />
            </button>
          </div>
        </div>

        {/* YouTube Filter Chips */}
        <div className="flex items-center gap-2 pt-1 pb-1">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`
              px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer
              ${
                filter === "all"
                  ? "bg-zinc-900 text-white shadow-xs"
                  : "bg-zinc-100 hover:bg-zinc-200/80 text-zinc-700"
              }
            `}
          >
            All
          </button>

          <button
            type="button"
            onClick={() => setFilter("unread")}
            className={`
              px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5
              ${
                filter === "unread"
                  ? "bg-zinc-900 text-white shadow-xs"
                  : "bg-zinc-100 hover:bg-zinc-200/80 text-zinc-700"
              }
            `}
          >
            <span>Unread</span>
            {unreadNotifications.length > 0 && (
              <span
                className={`
                  w-1.5 h-1.5 rounded-full
                  ${filter === "unread" ? "bg-red-400" : "bg-[#065fd4]"}
                `}
              />
            )}
          </button>
        </div>
      </div>

      {/* Notification List Container */}
      <div className="max-h-[440px] overflow-y-auto divide-y divide-zinc-100">
        {displayedNotifications.length === 0 ? (
          <div className="py-14 px-6 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-zinc-100 flex items-center justify-center mb-3 text-zinc-400">
              <Bell size={28} strokeWidth={1.75} />
            </div>
            <h4 className="text-sm font-semibold text-zinc-800">
              {filter === "unread"
                ? "You're all caught up!"
                : "Your notifications live here"}
            </h4>
            <p className="text-xs text-zinc-500 mt-1 max-w-[260px] leading-relaxed">
              {filter === "unread"
                ? "No unread policy or activity notifications right now."
                : "Activity and reminders for your policies will appear here."}
            </p>
          </div>
        ) : (
          displayedNotifications.slice(0, 10).map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              onClick={() => onNotificationClick(notification.id)}
              onDelete={onDeleteNotification}
              onMarkRead={onMarkRead}
            />
          ))
        )}
      </div>

      {/* YouTube Style Sticky Footer */}
      <div className="p-2 border-t border-zinc-100 bg-zinc-50/70 flex items-center justify-between">
        <button
          type="button"
          onClick={handleOpenPage}
          className="
            w-full flex items-center justify-center gap-1.5 py-2 px-3 
            text-xs font-semibold text-zinc-700 hover:text-zinc-950 
            hover:bg-zinc-200/60 rounded-xl transition-colors cursor-pointer
          "
        >
          <span>See all notifications in Notification Center</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}