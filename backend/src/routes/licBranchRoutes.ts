import { Router } from "express";
import express from "express";
import {
  createLicBranch,
  getAllLicBranches,
  getLicBranch,
  updateLicBranch,
  deleteLicBranch,
} from "../controllers/licBranchController.js";
import { protect, restrictTo } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.route("/")
  .get(getAllLicBranches)
  .post(restrictTo("ADMIN"), createLicBranch);

router.route("/:id")
  .get(getLicBranch)
  .patch(restrictTo("ADMIN"), updateLicBranch)
  .delete(restrictTo("ADMIN"), deleteLicBranch);

export default router;