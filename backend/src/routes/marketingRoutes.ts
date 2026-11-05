import { Router } from "express";
import { protect, restrictTo } from "../middlewares/authMiddleware.js";
import {
  fetchCampaigns,
  createNewCampaign,
  triggerCampaignSend,
  fetchAudienceEstimation,
} from "../controllers/marketingController.js";


const router = Router();

router.use(protect, restrictTo("ADMIN"));

router.get("/campaigns", fetchCampaigns);
router.post("/campaigns", createNewCampaign);
router.post("/campaigns/:id/send", triggerCampaignSend);
router.get("/audience", fetchAudienceEstimation);

export default router;
