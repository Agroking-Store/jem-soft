import { create } from "zustand";

import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead as markAllNotificationsReadApi,
  deleteNotification as deleteNotificationApi,
  deleteReadNotifications as deleteReadNotificationsApi,
} from "@/features/notifications/api/notificationApi";

interface NotificationState {
  notifications: any[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;

  fetchNotifications: () => Promise<void>;
  readNotification: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  deleteReadNotifications: () => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,

  fetchNotifications: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await getNotifications();
      const rawNotifications = response?.data ?? response;
      const notifications = Array.isArray(rawNotifications)
        ? rawNotifications
        : [];

      set({
        notifications,
        unreadCount: notifications.filter((n: any) => !n?.isRead).length,
        isLoading: false,
      });
    } catch (error: any) {
      console.error("Failed to fetch notifications:", error);
      set({
        notifications: [],
        unreadCount: 0,
        isLoading: false,
        error: error?.message || "Failed to fetch notifications",
      });
    }
  },

  readNotification: async (id: string) => {
    try {
      await markNotificationRead(id);

      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id
            ? {
                ...n,
                isRead: true,
              }
            : n
        ),

        unreadCount: state.notifications.filter(
          (n) => n.id !== id && !n.isRead
        ).length,
      }));
    } catch (error) {
      console.error("Failed to mark notification read:", error);
    }
  },

  markAllNotificationsRead: async () => {
    try {
      await markAllNotificationsReadApi();

      set((state) => ({
        notifications: state.notifications.map((n) => ({
          ...n,
          isRead: true,
        })),

        unreadCount: 0,
      }));
    } catch (error) {
      console.error("Failed to mark all notifications read:", error);
    }
  },

  deleteNotification: async (id: string) => {
    try {
      await deleteNotificationApi(id);

      set((state) => ({
        notifications: state.notifications.filter(
          (n) => n.id !== id
        ),

        unreadCount: state.notifications.filter(
          (n) => n.id !== id && !n.isRead
        ).length,
      }));
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  },

  deleteReadNotifications: async () => {
    try {
      await deleteReadNotificationsApi();

      set((state) => ({
        notifications: state.notifications.filter(
          (n) => !n.isRead
        ),

        unreadCount: state.notifications.filter(
          (n) => !n.isRead
        ).length,
      }));
    } catch (error) {
      console.error("Failed to delete read notifications:", error);
    }
  },
}));