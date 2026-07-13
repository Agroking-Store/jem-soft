import express from "express";
import * as controller from "../controllers/productAttributeMasterController.js";

const router = express.Router();

router
  .route("/")
  .get(controller.getProductAttributeMasters)
  .post(controller.createProductAttributeMaster);

router
  .route("/:id")
  .get(controller.getProductAttributeMasterById)
  .patch(controller.updateProductAttributeMaster)
  .delete(controller.deleteProductAttributeMaster);

export default router;