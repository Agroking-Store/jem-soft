import express from "express";
import {
  createPolicy,
  getAllPolicies,
  getPolicyById,
  getPoliciesByMember,
  updatePolicy,
  deletePolicy,
  previewPremium,
} from "../controllers/policyController.js";
import { protect, restrictTo } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.post("/premium-preview", restrictTo("ADMIN", "ADVISOR", "VIEWER"), previewPremium);

// Scoped to a specific member (life assured)
router.get("/member/:memberId", restrictTo("ADMIN", "ADVISOR", "VIEWER"), getPoliciesByMember);

router
    .route("/")
    .get(getAllPolicies)
    .post(restrictTo("ADMIN", "ADVISOR"), createPolicy);

router
  .route("/:id")
  .get(getPolicyById)
  .put(restrictTo("ADMIN", "ADVISOR"), updatePolicy)
  .delete(restrictTo("ADMIN", "ADVISOR"), deletePolicy);

export default router;
