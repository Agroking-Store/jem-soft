import express from "express";
import {
  createPolicy,
  getAllPolicies,
  deletePolicy,
} from "../controllers/policyController.js";
import { protect, restrictTo } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.route("/").get(getAllPolicies).post(restrictTo("ADMIN", "ADVISOR"), createPolicy);

router.route("/:id").delete(restrictTo("ADMIN", "ADVISOR"), deletePolicy);

export default router;