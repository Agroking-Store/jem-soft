import express from "express";
import * as riderMasterController from "../controllers/riderMasterController.js";
import { protect, restrictTo } from "../middlewares/authMiddleware.js";

const router = express.Router();

// All routes below are protected

router
  .route("/")
  .get(riderMasterController.getAllRiderMasters)
  .post(
    restrictTo("ADMIN"),
    riderMasterController.createRiderMaster
  );

router
  .route("/:id")
  .get(riderMasterController.getRiderMaster)
  .patch(restrictTo("ADMIN"), riderMasterController.updateRiderMaster)
  .delete(restrictTo("ADMIN"), riderMasterController.deleteRiderMaster);

export default router;