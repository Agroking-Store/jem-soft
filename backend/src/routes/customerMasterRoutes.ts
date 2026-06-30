import express from "express";
import {
  getAllCustomersMaster,
  getCustomerMaster,
  createCustomerMaster,
  updateCustomerMaster,
  deleteCustomerMaster,
} from "../controllers/customerMasterController.js";
import { protect, restrictTo } from "../middlewares/authMiddleware.js";

const router = express.Router();

// All routes are protected - system users only
router.use(protect);

router.get("/", restrictTo("ADMIN", "ADVISOR", "VIEWER"), getAllCustomersMaster);
router.get("/:id", restrictTo("ADMIN", "ADVISOR", "VIEWER"), getCustomerMaster);

// Admin & Advisor write access
router.post("/", restrictTo("ADMIN", "ADVISOR"), createCustomerMaster);
router.put("/:id", restrictTo("ADMIN", "ADVISOR"), updateCustomerMaster);
router.delete("/:id", restrictTo("ADMIN", "ADVISOR"), deleteCustomerMaster);

export default router;
