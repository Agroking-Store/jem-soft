import { Request, Response, NextFunction } from "express";
import * as productService from "../services/productMasterService.js";
import { catchAsync } from "../utils/catchAsync.js";
import { AppError } from "../utils/AppError.js";

// @desc    Get all products
// @route   GET /api/products
export const getProducts = catchAsync(async (req: Request, res: Response) => {
  const products = await productService.getProducts();
  res.status(200).json({ status: "success", data: products });
});

// @desc    Get single product
// @route   GET /api/products/:id
export const getProductById = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const product = await productService.getProductById(req.params.id);
  if (!product) {
    return next(new AppError("Product not found", 404));
  }
  res.status(200).json({ status: "success", data: product });
});

// @desc    Create a product
// @route   POST /api/products
// @access  Private/Admin
export const createProduct = catchAsync(async (req: Request, res: Response) => {
  const newProduct = await productService.createProduct(req.body);
  res.status(201).json({ status: "success", data: newProduct });
});

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private/Admin
export const updateProduct = catchAsync(async (req: Request, res: Response) => {
  const updatedProduct = await productService.updateProduct(req.params.id, req.body);
  res.status(200).json({ status: "success", data: updatedProduct });
});

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private/Admin
export const deleteProduct = catchAsync(async (req: Request, res: Response) => {
  await productService.deleteProduct(req.params.id);
  res.status(204).json({ status: "success", data: null });
});