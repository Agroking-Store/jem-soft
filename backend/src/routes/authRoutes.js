import express from "express";
import { register, login } from "../controllers/authController.js";
import { protect, restrictTo } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Public routes
router.post("/register", register);
router.post("/login", login);

// Protected route for testing, only ADMIN access
router.get("/admin-only", protect, restrictTo("ADMIN"), (req, res) => {
  res.status(200).json({ message: "Welcome Admin!" });
});

export default router;
