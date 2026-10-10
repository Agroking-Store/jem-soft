import express from "express";
import {
  createAgency,
  getAllAgencies,
  getAgency,
  updateAgency,
  deleteAgency,
} from "../controllers/agencyController.js";
import { protect, restrictTo } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.route("/")
  .get(getAllAgencies)
  .post(restrictTo("ADMIN"), createAgency);

router.route("/:id")
  .get(getAgency)
  .patch(restrictTo("ADMIN"), updateAgency)
  .delete(restrictTo("ADMIN"), deleteAgency);

export default router;