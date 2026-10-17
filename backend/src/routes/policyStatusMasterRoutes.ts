import express from "express";
import * as policyStatusMasterController from "../controllers/policyStatusMasterController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.route("/").get(policyStatusMasterController.getAllPolicyStatuses);

export default router;