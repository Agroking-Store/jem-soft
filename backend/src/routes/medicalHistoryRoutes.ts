import express from "express";
import {
  getMedicalHistoriesByMember,
  getMedicalHistory,
  createMedicalHistory,
  updateMedicalHistory,
  deleteMedicalHistory,
} from "../controllers/medicalHistoryController.js";
import { protect, restrictTo } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(protect);

// Scoped to a specific member
router.get("/member/:memberId", restrictTo("ADMIN", "ADVISOR", "VIEWER"), getMedicalHistoriesByMember);

router.get("/:id", restrictTo("ADMIN", "ADVISOR", "VIEWER"), getMedicalHistory);

router.post("/", restrictTo("ADMIN", "ADVISOR"), createMedicalHistory);
router.put("/:id", restrictTo("ADMIN", "ADVISOR"), updateMedicalHistory);
router.delete("/:id", restrictTo("ADMIN", "ADVISOR"), deleteMedicalHistory);

export default router;