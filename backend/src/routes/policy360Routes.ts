import express from "express";
import { protect, restrictTo } from "../middlewares/authMiddleware.js";
import { getLapsedPolicies } from "../controllers/policy360Controller.js";

const router = express.Router();

router.use(protect);

// GET /api/policy-360/lapsed
router.get("/lapsed", restrictTo("ADMIN", "ADVISOR", "VIEWER"), getLapsedPolicies);

export default router;
