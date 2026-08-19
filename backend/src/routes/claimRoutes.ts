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
import { protect } from "../middlewares/authMiddleware.js";
import { upload, handleUploadError } from "../utils/fileUpload.js";

const router = express.Router();

router.route("/").get(protect, getClaims).post(protect, addClaim);
router.route("/calculate").get(protect, calculateClaimAmount);
router.route("/loan-details").get(protect, getLoanDetails);

router
  .route("/:id")
  .get(protect, getClaimById)
  .put(protect, updateClaim)
  .delete(protect, deleteClaim);

// Document routes
router.get("/:id/documents", protect, getClaimDocuments);
router.post(
  "/:id/documents",
  protect,
  upload.array("documents", 10),
  handleUploadError,
  uploadClaimDocuments,
);
router.delete("/:id/documents/:documentId", protect, deleteClaimDocument);
router.get("/documents/file/:fileName", downloadClaimDocument);

export default router;
