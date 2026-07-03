import express from "express";
import * as policyController from "../controllers/policyController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.route("/").get(policyController.getAllPolicies).post(policyController.createPolicy);

export default router;