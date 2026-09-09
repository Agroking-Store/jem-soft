"use client";

import { useEffect, useState } from "react";
import { useNotificationStore } from "@/store/notificationStore";
import NotificationCard from "@/features/notifications/components/NotificationCard";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {ShieldAlert ,BookOpenCheck,BookText, Eye, Trash2,BellRing , ArrowLeft ,AlertCircle } from "lucide-react";

function ConfirmationModal({
  title,
  description,
  onCancel,
  onConfirm,
}: {
  title : string,
  description : string;
  onCancel: () => void;
  onConfirm: () => void;
}) {

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-50 rounded-xl">
            <AlertCircle size={22} className="text-red-500" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {title}
            </h3>
            <p className="text-xs text-slate-400">
              This action cannot be undone
            </p>
          </div>
        </div>
        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
          {description}
        </p>
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold text-sm rounded-lg shadow-sm transition-colors flex items-center gap-2"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

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
    await deleteReadNotifications();
    await fetchNotifications();
    setDeleteConfirmationModalOpen(false);
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    await fetchNotifications();
    setMarkConfirmationModalOpen(false);
  };

  type ModuleTab = "read" | "unread";

const TABS: { key: ModuleTab; label: string; icon: typeof BookOpenCheck }[] = [
  { key: "read",   label: `Read (${readNotifications.length})`,  icon: BookOpenCheck },
  { key: "unread",  label: `Unread (${unreadNotifications.length})`, icon: BookText },
];


  const [activeTab,setActivetab] = useState("read")
  const [markConfirmationModalOpen,setMarkConfirmationModalOpen] = useState(false)
  const [deleteConfirmationModalOpen,setDeleteConfirmationModalOpen] = useState(false)

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-blue-100 bg-[#f0f7ff] p-5 shadow-sm">
          <div className="flex flex-row gap-4 items-center">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-[#1e3a8a] to-[#2563eb] text-white shadow-lg shadow-blue-200/50">
              <BellRing />
            </span>
            <span>
              <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">
                Notifications
              </h1>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {window.history.back();}}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#5c67ff] to-[#3a47ff] px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-200 transition-all hover:brightness-110 active:scale-[0.98] cursor-pointer">
              <ArrowLeft size={18} />
              Back
            </button>
            {unreadNotifications.length > 0 && (
              <button
                onClick={() => setMarkConfirmationModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#5c67ff] to-[#3a47ff] px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-200 transition-all hover:brightness-110 active:scale-[0.98] cursor-pointer">
                <Eye size={18} />
                Mark All Read
              </button>
            )} 
            {readNotifications.length > 0 && (
              <button
                onClick={() => {setDeleteConfirmationModalOpen(true)}}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#5c67ff] to-[#3a47ff] px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-200 transition-all hover:brightness-110 active:scale-[0.98] cursor-pointer">
                <Trash2 size={18} />
                Delete All Read
              </button>
            )} 
          </div> 
    </div>

       

        <nav
      aria-label="Notification module navigation"
      className="inline-flex max-w-full bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100"
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
                text-[16px] font-bold whitespace-nowrap
                transition-all duration-200 select-none 
                cursor-pointer
                ${
                  isActive
                    ? "bg-[#1877F2] text-white shadow-md shadow-blue-200"
                    : "text-slate-500 hover:text-[#1877F2] hover:bg-[#1877F2]/10"
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
      {markConfirmationModalOpen &&
        <ConfirmationModal
        title = {"Mark all Notifications as Read"}
        description={"All notifications will be marked as Read"}
        onCancel={() => setMarkConfirmationModalOpen(false)}
        onConfirm={handleMarkAllRead}
        />
      }

      {deleteConfirmationModalOpen &&
        <ConfirmationModal
        title = {"Delete all Read Notifications"}
        description={"All Read notifications will be deleted"}
        onCancel={() => setDeleteConfirmationModalOpen(false)}
        onConfirm={handleDeleteAllRead}
        />
      }



    </div>
  );
}