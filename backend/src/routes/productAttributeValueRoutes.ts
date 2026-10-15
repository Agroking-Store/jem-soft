import express from "express";
import * as controller from "../controllers/productAttributeValueController.js";

const router = express.Router();

router
  .route("/")
  .get(controller.getProductAttributeValues)
  .post(controller.createProductAttributeValue);

router
  .route("/:id")
  .get(controller.getProductAttributeValueById)
  .patch(controller.updateProductAttributeValue)
  .delete(controller.deleteProductAttributeValue);

export default router;