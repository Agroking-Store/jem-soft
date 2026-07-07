import { Router } from "express";
import {
  fetchNotifications,
  fetchUnreadCount,
  readNotification,
} from "../controllers/notificationController.js";

const router = Router();

router.get("/", fetchNotifications);

router.get("/unread-count", fetchUnreadCount);

router.patch("/:id/read", readNotification);

export default router;