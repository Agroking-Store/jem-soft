import { Router } from "express";
import {
  triggerPolicyReminder,
  triggerDirectMessage,
  fetchCommunicationLogs,
  fetchReminderSettings,
  editReminderSettings,
  fetchTemplates,
  editTemplate,
  runManualSchedulerScan,
} from "../controllers/communicationController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = Router();

// Apply auth middleware
router.use(protect);

router.post("/send-reminder", triggerPolicyReminder);
router.post("/send-direct", triggerDirectMessage);
router.get("/logs", fetchCommunicationLogs);

router.get("/settings", fetchReminderSettings);
router.put("/settings", editReminderSettings);

router.get("/templates", fetchTemplates);
router.put("/templates/:id", editTemplate);

router.post("/run-scan", runManualSchedulerScan);

export default router;
