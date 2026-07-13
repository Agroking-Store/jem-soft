import { Request, Response } from "express";
import { catchAsync } from "../utils/catchAsync.js";
import * as service from "../services/productAttributeMasterService.js";

export const createProductAttributeMaster = catchAsync(async (req: Request, res: Response) => {
  const newAttribute = await service.createProductAttributeMaster(req.body);
  res.status(201).json({
    status: "success",
    data: {
      attribute: newAttribute,
    },
  });
});

export const getProductAttributeMasters = catchAsync(async (req: Request, res: Response) => {
  const attributes = await service.getProductAttributeMasters();
  res.status(200).json({
    status: "success",
    results: attributes.length,
    data: {
      attributes,
    },
  });
});

export const getProductAttributeMasterById = catchAsync(async (req: Request, res: Response) => {
  const attribute = await service.getProductAttributeMasterById(req.params.id);
  res.status(200).json({
    status: "success",
    data: {
      attribute,
    },
  });
});

export const updateProductAttributeMaster = catchAsync(async (req: Request, res: Response) => {
  const updatedAttribute = await service.updateProductAttributeMaster(req.params.id, req.body);
  res.status(200).json({
    status: "success",
    data: {
      attribute: updatedAttribute,
    },
  });
});

export const deleteProductAttributeMaster = catchAsync(async (req: Request, res: Response) => {
  await service.deleteProductAttributeMaster(req.params.id);
  res.status(204).json({ status: "success", data: null });
});