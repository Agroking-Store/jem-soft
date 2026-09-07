import express from "express";
import { protect, restrictTo } from "../middlewares/authMiddleware.js";
import {
  getAllPayments,
  getPaymentsByPolicy,
  getPayment,
  createPayment,
  updatePayment,
  // markPaymentAsPaid,
  deletePayment,
} from "../controllers/premiumPaymentController.js";

const router = express.Router();

router.use(protect);

router.get("/", restrictTo("ADMIN", "ADVISOR", "VIEWER"), getAllPayments);
router.get("/policy/:policyId", restrictTo("ADMIN", "ADVISOR", "VIEWER"), getPaymentsByPolicy);
router.get("/:id", restrictTo("ADMIN", "ADVISOR", "VIEWER"), getPayment);

router.post("/", restrictTo("ADMIN", "ADVISOR"), createPayment);
router.put("/:id", restrictTo("ADMIN", "ADVISOR"), updatePayment);
// router.post("/:id/pay", restrictTo("ADMIN", "ADVISOR"), markPaymentAsPaid);
router.delete("/:id", restrictTo("ADMIN", "ADVISOR"), deletePayment);

export default router;
