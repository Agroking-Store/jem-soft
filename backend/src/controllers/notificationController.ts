import { Request, Response } from "express";
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
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