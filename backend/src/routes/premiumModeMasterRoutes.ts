import express from "express";
import * as premiumModeMasterController from "../controllers/premiumModeMasterController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.route("/").get(premiumModeMasterController.getAllPremiumModes);

export default router;