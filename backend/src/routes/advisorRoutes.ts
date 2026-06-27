import express from "express";
import {
  getAllAdvisors,
  getAdvisor,
  createAdvisor,
  updateAdvisor,
  deleteAdvisor,
} from "../controllers/advisorController.js";
import { protect, restrictTo } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.get("/", restrictTo("ADMIN", "ADVISOR", "VIEWER"), getAllAdvisors);
router.get("/:id", restrictTo("ADMIN", "ADVISOR", "VIEWER"), getAdvisor);
router.post("/", restrictTo("ADMIN", "ADVISOR"), createAdvisor);
router.put("/:id", restrictTo("ADMIN", "ADVISOR"), updateAdvisor);
router.delete("/:id", restrictTo("ADMIN", "ADVISOR"), deleteAdvisor);

export default router;
