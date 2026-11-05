import express from "express";
import {
  getClaims,
  getClaimById,
  calculateClaimAmount,
  getLoanDetails,
  addClaim,
  updateClaim,
  deleteClaim,
  uploadClaimDocuments,
  deleteClaimDocument,
  getClaimDocuments,
  downloadClaimDocument,
} from "../controllers/claimController.js";
import { protect, restrictTo } from "../middlewares/authMiddleware.js";
import { upload, handleUploadError } from "../utils/fileUpload.js";

const router = express.Router();

router
  .route("/")
  .get(protect, getClaims)
  .post(protect, restrictTo("ADMIN", "ADVISOR"), addClaim);
router.route("/calculate").get(protect, calculateClaimAmount);
router.route("/loan-details").get(protect, getLoanDetails);

router
  .route("/:id")
  .get(protect, getClaimById)
  .put(protect, restrictTo("ADMIN", "ADVISOR"), updateClaim)
  .delete(protect, restrictTo("ADMIN", "ADVISOR"), deleteClaim);

// Document routes
router.get("/:id/documents", protect, getClaimDocuments);
router.post(
  "/:id/documents",
  protect,
  restrictTo("ADMIN", "ADVISOR"),
  upload.array("documents", 10),
  handleUploadError,
  uploadClaimDocuments,
);
router.delete(
  "/:id/documents/:documentId",
  protect,
  restrictTo("ADMIN", "ADVISOR"),
  deleteClaimDocument,
);
router.get("/documents/file/:fileName", downloadClaimDocument);

export default router;
