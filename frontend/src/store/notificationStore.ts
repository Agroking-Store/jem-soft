import { create } from "zustand";

import {
    getNotifications,
    markNotificationRead,
    deleteNotification as deleteNotificationApi,
} from "@/features/notifications/api/notificationApi";


import {
    deleteReadNotifications as deleteReadNotificationsApi
}
    from "@/features/notifications/api/notificationApi";


interface NotificationState {
    notifications: any[];

    unreadCount: number;

    fetchNotifications: () => Promise<void>;

    readNotification: (id: string) => Promise<void>;

    deleteNotification: (id: string) => Promise<void>;

    deleteReadNotifications: () => Promise<void>;
}

export const useNotificationStore =
    create<NotificationState>((set) => ({

        notifications: [],

        unreadCount: 0,

        fetchNotifications: async () => {

            const response = await getNotifications();

            const notifications = response.data;

            set({

                notifications,

                unreadCount: notifications.filter(
                    (n: any) => !n.isRead
                ).length,

            });

        },

        readNotification: async (id: string) => {

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

        },

        deleteNotification: async (id: string) => {

            await deleteNotificationApi(id);

            set((state) => ({

                notifications: state.notifications.filter(
                    (n) => n.id !== id
                ),

                unreadCount: state.notifications.filter(
                    (n) => n.id !== id && !n.isRead
                ).length,

            }));

        },



        deleteReadNotifications: async () => {

            await deleteReadNotificationsApi();

            set((state) => ({

                notifications:
                    state.notifications.filter(
                        n => !n.isRead
                    ),

                unreadCount:
                    state.notifications.filter(
                        n => !n.isRead
                    ).length

            }));

        },

    }));