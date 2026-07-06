import express from "express";
import {
  createPolicy,
  getAllPolicies,
  getPolicyById,
  updatePolicy,
  deletePolicy,
} from "../controllers/policyController.js";
import { protect, restrictTo } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(protect);
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