import prisma from "../config/database.js";
import { Prisma, NotificationType } from "@prisma/client";

export const createNotification = async (
  tx: Prisma.TransactionClient,
  {
    title,
    message,
    type,
    policyId,
  }: {
    title: string;
    message: string;
    type: NotificationType;
    policyId?: string;
  }
) => {
  return tx.notification.create({
    data: {
      title,
      message,
      type,
      policyId,
    },
  });
};

export const getNotifications = async () => {
  return prisma.notification.findMany({
    orderBy: {
      createdAt: "desc",
    },
    take: 20,
  });
};

export const getUnreadNotificationCount = async () => {
  return prisma.notification.count({
    where: {
      isRead: false,
    },
  });
};


export const markNotificationAsRead = async (id: string) => {
  return prisma.notification.update({
    where: {
      id,
    },
    data: {
      isRead: true,
    },
  });
};


export const deleteNotification = async (
  id: string
) => {

  return prisma.notification.delete({

    where: {
      id,
    },

  });

};



export const markAllNotificationsAsRead = async () => {
  return prisma.notification.updateMany({
    where: {
      isRead: false,
    },
    data: {
      isRead: true,
    },
  });
};



export const deleteReadNotifications = async () => {
  return prisma.notification.deleteMany({
    where: {
      isRead: true,
    },
  });
};