import { Router } from "express";
import {
  fetchCampaigns,
  createNewCampaign,
  triggerCampaignSend,
  triggerCampaignTestEmail,
  fetchAudienceEstimation,
} from "../controllers/marketingController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = Router();

router.use(protect);

router.get("/campaigns", fetchCampaigns);
router.post("/campaigns", createNewCampaign);
router.post("/campaigns/test-email", triggerCampaignTestEmail);
router.post("/campaigns/:id/send", triggerCampaignSend);
router.get("/audience", fetchAudienceEstimation);

export default router;
