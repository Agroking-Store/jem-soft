import express from "express";
import {
  getAllCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  loginCustomer,
} from "../controllers/customerController.js";
import { protect, restrictTo } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Public route - Customer portal login
router.post("/login", loginCustomer);

// Protected routes - all logged-in system users can view
router.use(protect);
router.get("/", restrictTo("ADMIN", "ADVISOR", "VIEWER"), getAllCustomers);
router.get("/:id", restrictTo("ADMIN", "ADVISOR", "VIEWER"), getCustomer);

// Write routes - only ADMIN and ADVISOR
router.post("/", restrictTo("ADMIN", "ADVISOR"), createCustomer);
router.put("/:id", restrictTo("ADMIN", "ADVISOR"), updateCustomer);
router.delete("/:id", restrictTo("ADMIN", "ADVISOR"), deleteCustomer);

export default router;
