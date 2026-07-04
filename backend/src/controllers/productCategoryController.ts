import { Request, Response, NextFunction } from "express";
import * as categoryService from "../services/productCategoryService.js";
import { catchAsync } from "../utils/catchAsync.js";
import { AppError } from "../utils/AppError.js";

// @desc    Get all product categories
// @route   GET /api/product-categories
export const getProductCategories = catchAsync(
  async (_req: Request, res: Response) => {
    const categories = await categoryService.getCategories();
    res.status(200).json({ status: "success", data: categories });
  },
);

// @desc    Get single product category
// @route   GET /api/product-categories/:id
export const getProductCategoryById = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const category = await categoryService.getCategoryById(req.params.id);
    if (!category) {
      return next(new AppError("Product category not found", 404));
    }
    res.status(200).json({ status: "success", data: category });
  },
);

// @desc    Create a product category
// @route   POST /api/product-categories
// @access  Private/Admin
export const createProductCategory = catchAsync(
  async (req: Request, res: Response) => {
    const newCategory = await categoryService.createCategory(req.body);
    res.status(201).json({ status: "success", data: newCategory });
  },
);

// @desc    Update a product category
// @route   PUT /api/product-categories/:id
// @access  Private/Admin
export const updateProductCategory = catchAsync(
  async (req: Request, res: Response) => {
    const updatedCategory = await categoryService.updateCategory(
      req.params.id,
      req.body,
    );
    res.status(200).json({ status: "success", data: updatedCategory });
  },
);

// @desc    Delete a product category
// @route   DELETE /api/product-categories/:id
// @access  Private/Admin
export const deleteProductCategory = catchAsync(
  async (req: Request, res: Response) => {
    await categoryService.deleteCategory(req.params.id);
    res.status(204).json({ status: "success", data: null });
  },
);
