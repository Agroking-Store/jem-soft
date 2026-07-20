import express from "express";
import {
  getAllFamilyHistories,
  getFamilyHistory,
  getFamilyHistoriesByMember,
  createFamilyHistory,
  updateFamilyHistory,
  deleteFamilyHistory,
} from "../controllers/familyHistoryController.js";
import { protect, restrictTo } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/", restrictTo("ADMIN", "ADVISOR", "VIEWER"), getAllFamilyHistories);
// Scoped to a specific member (life assured)
router.get("/member/:memberId", restrictTo("ADMIN", "ADVISOR", "VIEWER"), getFamilyHistoriesByMember);
router.get("/:id", restrictTo("ADMIN", "ADVISOR", "VIEWER"), getFamilyHistory);

router.post("/", restrictTo("ADMIN", "ADVISOR"), createFamilyHistory);
router.put("/:id", restrictTo("ADMIN", "ADVISOR"), updateFamilyHistory);
router.delete("/:id", restrictTo("ADMIN", "ADVISOR"), deleteFamilyHistory);

export default router;
