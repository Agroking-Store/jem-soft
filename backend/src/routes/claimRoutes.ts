import express from "express";
import {
  getClaims,
  getClaimById,
  calculateClaimAmount,
  getLoanDetails,
  addClaim,
  updateClaim,
  deleteClaim,
} from "../controllers/claimController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.route("/").get(protect, getClaims).post(protect, addClaim);
router.route("/calculate").get(protect, calculateClaimAmount);
router.route("/loan-details").get(protect, getLoanDetails);

router
  .route("/:id")
  .get(protect, getClaimById)
  .put(protect, updateClaim)
  .delete(protect, deleteClaim);

export default router;
