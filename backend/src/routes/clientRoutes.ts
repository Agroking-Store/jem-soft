import express from "express";
import {
  getAllClients,
  getClient,
  createClient,
  updateClient,
  deleteClient,
  loginClient,
} from "../controllers/clientController.js";
import { protect, restrictTo } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Public route - Client portal login
router.post("/login", loginClient);

// Protected routes - all logged-in system users can view
router.use(protect);
router.get("/", restrictTo("ADMIN", "ADVISOR", "VIEWER"), getAllClients);
router.get("/:id", restrictTo("ADMIN", "ADVISOR", "VIEWER"), getClient);

// Write routes - only ADMIN and ADVISOR
router.post("/", restrictTo("ADMIN", "ADVISOR"), createClient);
router.put("/:id", restrictTo("ADMIN", "ADVISOR"), updateClient);
router.delete("/:id", restrictTo("ADMIN", "ADVISOR"), deleteClient);

export default router;
