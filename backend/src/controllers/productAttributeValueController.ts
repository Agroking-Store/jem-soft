import { Request, Response } from "express";
import { catchAsync } from "../utils/catchAsync.js";
import * as service from "../services/productAttributeValueService.js";

export const createProductAttributeValue = catchAsync(async (req: Request, res: Response) => {
  const newValue = await service.createProductAttributeValue(req.body);
  res.status(201).json({
    status: "success",
    data: {
      value: newValue,
    },
  });
});

export const getProductAttributeValues = catchAsync(async (req: Request, res: Response) => {
  const values = await service.getProductAttributeValues();
  res.status(200).json({
    status: "success",
    results: values.length,
    data: {
      values,
    },
  });
});

export const getProductAttributeValueById = catchAsync(async (req: Request, res: Response) => {
  const value = await service.getProductAttributeValueById(req.params.id);
  res.status(200).json({
    status: "success",
    data: {
      value,
    },
  });
});

export const updateProductAttributeValue = catchAsync(async (req: Request, res: Response) => {
  const updatedValue = await service.updateProductAttributeValue(req.params.id, req.body);
  res.status(200).json({
    status: "success",
    data: {
      value: updatedValue,
    },
  });
});

export const deleteProductAttributeValue = catchAsync(async (req: Request, res: Response) => {
  await service.deleteProductAttributeValue(req.params.id);
  res.status(204).json({ status: "success", data: null });
});