import api from "@/lib/axios";

export const getNotifications = async () => {
  const response = await api.get("/notifications");
  return response.data;
};

export const markNotificationRead = async (id: string) => {
  const response = await api.patch(`/notifications/${id}/read`);
  return response.data;
};

export const deleteNotification = async (id: string) => {
  const response = await api.delete(`/notifications/${id}`);
  return response.data;
};

export const deleteReadNotifications = async () => {
  const response = await api.delete("/notifications/read");
  return response.data;
};

export const markAllNotificationsRead = async () => {
  const response = await api.patch("/notifications/mark-all-read");
  return response.data;
};