import express from "express";
import {
  getInsuranceProviders,
  getInsuranceProviderById,
  createInsuranceProvider,
  updateInsuranceProvider,
  deleteInsuranceProvider,
} from "../controllers/insuranceProviderController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();
router.use(protect);

router.route("/")
  .get(getInsuranceProviders)
  .post(createInsuranceProvider);

router.route("/:id")
  .get(getInsuranceProviderById)
  .put(updateInsuranceProvider)
  .delete(deleteInsuranceProvider);

export default router;