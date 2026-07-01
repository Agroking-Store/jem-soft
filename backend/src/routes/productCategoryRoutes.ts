import express from "express";
import {
  getProductCategories,
  getProductCategoryById,
  createProductCategory,
  updateProductCategory,
  deleteProductCategory,
} from "../controllers/productCategoryController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();
router.use(protect);

router.route("/")
  .get(getProductCategories)
  .post(createProductCategory);

router.route("/:id")
  .get(getProductCategoryById)
  .put(updateProductCategory)
  .delete(deleteProductCategory);

export default router;