import { Router } from "express";
import {
  deleteNotification,
  deleteReadNotifications,
  fetchNotifications,
  fetchUnreadCount,
  readNotification,
  markAllRead,
} from "../controllers/notificationController.js";

const router = Router();

router.get("/", fetchNotifications);

router.get("/unread-count", fetchUnreadCount);

router.patch("/:id/read", readNotification);

router.patch("/mark-all-read", markAllRead);


router.delete("/read", deleteReadNotifications);

router.delete("/:id", deleteNotification);



export default router;