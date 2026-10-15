import express from "express";
import {
  getLoans,
  getLoan,
  addLoan,
  updateLoan,
  deleteLoan,
} from "../controllers/loanController.js";
import {
  getRepayments,
  createRepayment,
} from "../controllers/loanRepaymentController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.route("/").get(protect, getLoans).post(protect, addLoan);

router
  .route("/:id")
  .get(protect, getLoan)
  .put(protect, updateLoan)
  .delete(protect, deleteLoan);

router
  .route("/:loanId/repayments")
  .get(protect, getRepayments)
  .post(protect, createRepayment);

export default router;
