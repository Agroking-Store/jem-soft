import express from "express";
import { register, login, getCurrentUser } from "../controllers/authController.js";
import { protect, restrictTo } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Public routes
router.post("/register", register);
router.post("/login", login);

// Protected routes
router.get("/me", protect, getCurrentUser);

// Admin only routes
router.get("/admin-only", protect, restrictTo("ADMIN"), (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Welcome Admin! You have full access.",
    data: {
      user: req.user,
      access: "admin",
    },
  });
});

// Advisor routes
router.get("/advisor-only", protect, restrictTo("ADVISOR", "ADMIN", "VIEWER"), (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Welcome Advisor!",
    data: {
      user: req.user,
      access: "advisor",
    },
  });
});

export default router;