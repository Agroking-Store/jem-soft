"use client";

import { useEffect, useState, useMemo } from "react";
import { useNotificationStore } from "@/store/notificationStore";
import NotificationCard from "@/features/notifications/components/NotificationCard";
import { 
  Bell, 
  CheckCheck, 
  Trash2, 
  ArrowLeft, 
  Search, 
  AlertCircle,
  Sparkles
} from "lucide-react";

function ConfirmationModal({
  title,
  description,
  confirmText = "Confirm",
  confirmVariant = "danger",
  onCancel,
  onConfirm,
}: {
  title: string;
  description: string;
  confirmText?: string;
  confirmVariant?: "danger" | "primary";
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 animate-in zoom-in-95 duration-150">
        <div className="flex items-center gap-3.5 mb-3.5">
          <div
            className={`p-2.5 rounded-xl ${
              confirmVariant === "danger"
                ? "bg-rose-50 text-rose-600"
                : "bg-blue-50 text-[#065fd4]"
            }`}
          >
            <AlertCircle size={22} />
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-900">{title}</h3>
            <p className="text-xs text-zinc-400">Confirmation required</p>
          </div>
        </div>

        <p className="text-sm text-zinc-600 mb-6 leading-relaxed">
          {description}
        </p>

        <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-full border border-zinc-200 hover:bg-zinc-100 text-zinc-700 font-semibold text-xs transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-5 py-2 rounded-full text-white font-semibold text-xs transition-all shadow-xs cursor-pointer ${
              confirmVariant === "danger"
                ? "bg-[#cc0000] hover:bg-red-700"
                : "bg-[#065fd4] hover:bg-blue-700"
            }`}
          >
            {confirmText}
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

  const [activeFilter, setActiveFilter] = useState<"all" | "unread" | "read">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [markModalOpen, setMarkModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const unreadNotifications = useMemo(
    () => notifications.filter((n) => !n.isRead),
    [notifications]
  );

  const readNotifications = useMemo(
    () => notifications.filter((n) => n.isRead),
    [notifications]
  );

  const filteredNotifications = useMemo(() => {
    let list = notifications;
    if (activeFilter === "unread") {
      list = unreadNotifications;
    } else if (activeFilter === "read") {
      list = readNotifications;
    }

    if (!searchQuery.trim()) return list;

    const query = searchQuery.toLowerCase();
    return list.filter(
      (n) =>
        n.title?.toLowerCase().includes(query) ||
        n.message?.toLowerCase().includes(query) ||
        n.policyId?.toLowerCase().includes(query)
    );
  }, [notifications, activeFilter, searchQuery, unreadNotifications, readNotifications]);

  const handleNotificationClick = async (id: string) => {
    await readNotification(id);
    await fetchNotifications();
  };

  const handleDeleteNotification = async (id: string) => {
    await deleteNotification(id);
    await fetchNotifications();
  };

  const handleConfirmDeleteAllRead = async () => {
    await deleteReadNotifications();
    await fetchNotifications();
    setDeleteModalOpen(false);
  };

  const handleConfirmMarkAllRead = async () => {
    await markAllNotificationsRead();
    await fetchNotifications();
    setMarkModalOpen(false);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-12">
      {/* YouTube Style Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-5 rounded-2xl bg-white border border-zinc-200/90 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-800 shadow-2xs relative">
            <Bell size={24} strokeWidth={2} />
            {unreadNotifications.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[20px] h-[20px] px-1 rounded-full bg-[#cc0000] text-white text-[10px] font-bold flex items-center justify-center border-2 border-white shadow-xs">
                {unreadNotifications.length > 9 ? "9+" : unreadNotifications.length}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900">
              Notification Center
            </h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              Stay updated with real-time policy alerts, premium schedules, and activities.
            </p>
          </div>
        </div>

        {/* YouTube Header Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-800 transition-colors cursor-pointer"
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>

          {unreadNotifications.length > 0 && (
            <button
              type="button"
              onClick={() => setMarkModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-full bg-zinc-900 hover:bg-zinc-800 text-white transition-all shadow-xs cursor-pointer"
            >
              <CheckCheck size={16} />
              <span>Mark all read</span>
            </button>
          )}

          {readNotifications.length > 0 && (
            <button
              type="button"
              onClick={() => setDeleteModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-full bg-zinc-100 hover:bg-rose-50 text-zinc-700 hover:text-rose-600 border border-zinc-200/80 transition-colors cursor-pointer"
            >
              <Trash2 size={16} />
              <span>Clear read</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Chips & Search Bar (YouTube Pill Row) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-3 rounded-2xl border border-zinc-200/90 shadow-xs">
        {/* YouTube Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveFilter("all")}
            className={`
              px-4 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer
              ${
                activeFilter === "all"
                  ? "bg-zinc-900 text-white shadow-xs"
                  : "bg-zinc-100 hover:bg-zinc-200 text-zinc-800"
              }
            `}
          >
            All ({notifications.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter("unread")}
            className={`
              px-4 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5
              ${
                activeFilter === "unread"
                  ? "bg-zinc-900 text-white shadow-xs"
                  : "bg-zinc-100 hover:bg-zinc-200 text-zinc-800"
              }
            `}
          >
            <span>Unread ({unreadNotifications.length})</span>
            {unreadNotifications.length > 0 && (
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  activeFilter === "unread" ? "bg-red-400" : "bg-[#065fd4]"
                }`}
              />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter("read")}
            className={`
              px-4 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer
              ${
                activeFilter === "read"
                  ? "bg-zinc-900 text-white shadow-xs"
                  : "bg-zinc-100 hover:bg-zinc-200 text-zinc-800"
              }
            `}
          >
            Read ({readNotifications.length})
          </button>
        </div>

        {/* Quick Search */}
        <div className="relative min-w-[240px] max-w-xs">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notifications..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-zinc-100 border border-transparent rounded-full focus:bg-white focus:border-zinc-300 focus:outline-none transition-all placeholder:text-zinc-400"
          />
        </div>
      </div>

      {/* Main YouTube Feed List */}
      <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-xs divide-y divide-zinc-100 overflow-hidden">
        {filteredNotifications.length === 0 ? (
          <div className="py-20 px-6 text-center flex flex-col items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-zinc-100 flex items-center justify-center mb-4 text-zinc-400 ring-8 ring-zinc-50">
              <Bell size={36} strokeWidth={1.6} />
            </div>
            <h3 className="text-base font-bold text-zinc-900">
              {searchQuery
                ? "No matching notifications found"
                : activeFilter === "unread"
                ? "You're all caught up!"
                : "Your notifications live here"}
            </h3>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm leading-relaxed">
              {searchQuery
                ? `No notifications found matching "${searchQuery}". Try searching with different terms.`
                : activeFilter === "unread"
                ? "There are no unread notifications right now. Check back later for new updates."
                : "Activity and reminders for your policies will appear here."}
            </p>
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              onClick={() => handleNotificationClick(notification.id)}
              onDelete={handleDeleteNotification}
              onMarkRead={handleNotificationClick}
            />
          ))
        )}
      </div>

      {/* Confirmation Modals */}
      {markModalOpen && (
        <ConfirmationModal
          title="Mark All as Read"
          description="Are you sure you want to mark all notifications as read?"
          confirmText="Mark as read"
          confirmVariant="primary"
          onCancel={() => setMarkModalOpen(false)}
          onConfirm={handleConfirmMarkAllRead}
        />
      )}

      {deleteModalOpen && (
        <ConfirmationModal
          title="Clear Read Notifications"
          description="Are you sure you want to permanently delete all read notifications? This action cannot be undone."
          confirmText="Delete"
          confirmVariant="danger"
          onCancel={() => setDeleteModalOpen(false)}
          onConfirm={handleConfirmDeleteAllRead}
        />
      )}
    </div>
  );
}