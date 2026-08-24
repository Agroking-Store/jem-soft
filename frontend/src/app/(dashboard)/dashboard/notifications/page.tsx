"use client";

import { useEffect, useState } from "react";
import { useNotificationStore } from "@/store/notificationStore";
import NotificationCard from "@/features/notifications/components/NotificationCard";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {ShieldAlert ,BookOpenCheck,BookText, Eye, Trash2,BellRing , ArrowLeft} from "lucide-react";

export default function NotificationsPage() {

  const {
    notifications,
    fetchNotifications,
    readNotification,
    deleteNotification,
    deleteReadNotifications,
    markAllNotificationsRead,
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

  const handleMarkAllRead = async () => {
    const confirmed = window.confirm(
      "Mark all unread notifications as read?"
    );

    if (!confirmed) return;

    await markAllNotificationsRead();
    await fetchNotifications();
  };

  type ModuleTab = "read" | "unread";

const TABS: { key: ModuleTab; label: string; icon: typeof BookOpenCheck }[] = [
  { key: "read",   label: `Read (${readNotifications.length})`,  icon: BookOpenCheck },
  { key: "unread",  label: `Unread (${unreadNotifications.length})`, icon: BookText },
];


  const [activeTab,setActivetab] = useState("read")

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0B1220] text-[#E8C77A]">
            <BellRing />
          </span>
          <span>
            <h1 className="text-2xl font-serif font-semibold tracking-tight text-slate-900">
              Notifications
            </h1>
          </span>
        </div>
        <div className="flex items-center gap-3">

           <button
              onClick={() => {window.history.back();}}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0B1220] px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-[#0B1220]/20 transition-colors hover:bg-[#16294D]">
              <ArrowLeft size={18} />
              Back
            </button>
          {unreadNotifications.length > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0B1220] px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-[#0B1220]/20 transition-colors hover:bg-[#16294D]">
              <Eye size={18} />
              Mark All Read
            </button>
          )}

          {readNotifications.length > 0 && (
            <button
              onClick={handleDeleteAllRead}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0B1220] px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-[#0B1220]/20 transition-colors hover:bg-[#16294D]">
              <Trash2 size={18} />
              Delete All Read
            </button>
          )}
        </div>
      </div>

       

        <nav
      aria-label="Notification module navigation"
      className="inline-flex max-w-full bg-[#0B1220] rounded-2xl shadow-lg shadow-[#0B1220]/20 p-1"
    >
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
        {TABS.map(({ key, label, icon: Icon }) => {
          const isActive = activeTab === key;
          return (
            <button
              key = {key}
              aria-current={isActive ? "page" : undefined}
              className={`
                relative flex items-center gap-2 px-4 py-2 rounded-xl
                text-[13px] font-bold whitespace-nowrap
                transition-all duration-200 select-none
                ${
                  isActive
                    ? "bg-gradient-to-r from-[#B8873A] to-[#D9AE63] text-[#0B1220] shadow-md shadow-black/30"
                    : "text-white/55 hover:text-white hover:bg-white/[0.07] active:bg-white/10"
                }
              `}
              onClick={() => setActivetab(key)}
            >
              <Icon size={15} strokeWidth={isActive ? 2.6 : 2} />
              <span className="tracking-tight">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>

      {/* </div> */}

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

      {unreadNotifications.length > 0 && activeTab === "unread" && (
        <div className="mb-8">

          <div className="overflow-hidden rounded-xl border bg-white shadow-sm">

            {unreadNotifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                onClick={() => handleNotificationClick(notification.id)}
                onDelete={handleDeleteNotification}
              />
            ))}

          </div>

        </div>
      )}

      {/* Read */}

      {readNotifications.length > 0 && activeTab === "read" && (
        <div>
          <div className="overflow-hidden rounded-xl border bg-white shadow-sm">

            {readNotifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                onClick={() => handleNotificationClick(notification.id)}
                onDelete={handleDeleteNotification}
              />
            ))}

          </div>

        </div>
      )}

    </div>
  );
}