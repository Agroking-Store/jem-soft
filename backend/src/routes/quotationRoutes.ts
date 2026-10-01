import express from "express";
import {
  getNextRefNo,
  calculateQuotationPreview,
  createQuotation,
  getAllQuotations,
  getQuotationById,
  deleteQuotation,
} from "../controllers/quotationController.js";
import { protect, restrictTo } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/next-ref", restrictTo("ADMIN", "ADVISOR", "VIEWER"), getNextRefNo);
router.post("/calculate", restrictTo("ADMIN", "ADVISOR", "VIEWER"), calculateQuotationPreview);

router
  .route("/")
  .get(restrictTo("ADMIN", "ADVISOR", "VIEWER"), getAllQuotations)
  .post(restrictTo("ADMIN", "ADVISOR"), createQuotation);

router
  .route("/:id")
  .get(restrictTo("ADMIN", "ADVISOR", "VIEWER"), getQuotationById)
  .delete(restrictTo("ADMIN", "ADVISOR"), deleteQuotation);

export default router;
