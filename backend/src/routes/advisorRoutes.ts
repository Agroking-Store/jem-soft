import express from "express";
import * as advisorController from "../controllers/advisorController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.route("/").get(advisorController.getAllAdvisors);

export default router;