import { Request, Response } from "express";
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification as deleteNotificationService,
} from "../services/notificationService.js";

import {
  deleteReadNotifications as deleteReadNotificationsService,
} from "../services/notificationService.js";



export const fetchNotifications = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const notifications = await getNotifications();

    res.status(200).json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    console.error("Fetch Notifications Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch notifications.",
    });
  }
};

export const fetchUnreadCount = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const count = await getUnreadNotificationCount();

    res.status(200).json({
      success: true,
      data: count,
    });
  } catch (error) {
    console.error("Unread Count Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch unread notification count.",
    });
  }
};

export const readNotification = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const notification = await markNotificationAsRead(id);

    res.status(200).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    console.error("Mark Notification Read Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to mark notification as read.",
    });
  }
};



export const markAllRead = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    await markAllNotificationsAsRead();

    res.status(200).json({
      success: true,
      message: "All notifications marked as read.",
    });
  } catch (error) {
    console.error("Mark All Read Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to mark all notifications as read.",
    });
  }
};

export const deleteNotification = async (
  req: Request,
  res: Response
) => {
  try {
    const { id } = req.params;

    await deleteNotificationService(id);

    res.status(200).json({
      success: true,
      message: "Notification deleted successfully",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to delete notification",
    });
  }
};

export const deleteReadNotifications = async (
  req: Request,
  res: Response
) => {
  try {
    await deleteReadNotificationsService();

    res.status(200).json({
      success: true,
      message: "All read notifications deleted.",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to delete read notifications.",
    });
  }
};