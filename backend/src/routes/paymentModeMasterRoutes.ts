import express from "express";
import * as paymentModeMasterController from "../controllers/paymentModeMasterController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.route("/").get(paymentModeMasterController.getAllPaymentModes);

export default router;