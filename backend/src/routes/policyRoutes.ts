import express from "express";
import * as policyController from "../controllers/policyController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router
  .route("/")
  .get(protect, policyController.getAllPolicies)
  .post(protect, policyController.createPolicy);
router.route("/:id").get(protect, policyController.getPolicyById);

export default router;
