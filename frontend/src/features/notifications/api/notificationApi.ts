import api from "@/lib/axios";

export const getNotifications = async () => {
  try {
    const response = await api.get("/notifications");
    return response.data;
  } catch (error: any) {
    console.warn(
      "Failed to fetch notifications (Backend might be offline or endpoint not ready):",
      error?.message,
    );
    return { status: "error", data: [], unreadCount: 0 };
  }
};

export const markNotificationRead = async (id: string) => {
  try {
    const response = await api.patch(`/notifications/${id}/read`);
    return response.data;
  } catch (error: any) {
    console.error(`Failed to mark notification ${id} as read:`, error?.message);
    throw error;
  }
};

export const deleteNotification = async (id: string) => {
  try {
    const response = await api.delete(`/notifications/${id}`);
    return response.data;
  } catch (error: any) {
    console.error(`Failed to delete notification ${id}:`, error?.message);
    throw error;
  }
};

export const deleteReadNotifications = async () => {
  try {
    const response = await api.delete("/notifications/read");
    return response.data;
  } catch (error: any) {
    console.error("Failed to delete read notifications:", error?.message);
    throw error;
  }
};

export const markAllNotificationsRead = async () => {
  try {
    const response = await api.patch("/notifications/mark-all-read");
    return response.data;
  } catch (error: any) {
    console.error("Failed to mark all notifications as read:", error?.message);
    throw error;
  }
};
