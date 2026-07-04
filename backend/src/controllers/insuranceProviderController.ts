import { Request, Response, NextFunction } from "express";
import * as providerService from "../services/insuranceProviderService.js";
import { catchAsync } from "../utils/catchAsync.js";
import { AppError } from "../utils/AppError.js";

// @desc    Get all insurance providers
// @route   GET /api/insurance-providers
export const getInsuranceProviders = catchAsync(
  async (_req: Request, res: Response) => {
    const providers = await providerService.getProviders();
    res.status(200).json({ status: "success", data: providers });
  },
);

// @desc    Get single insurance provider
// @route   GET /api/insurance-providers/:id
export const getInsuranceProviderById = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const provider = await providerService.getProviderById(req.params.id);
    if (!provider) {
      return next(new AppError("Insurance provider not found", 404));
    }
    res.status(200).json({ status: "success", data: provider });
  },
);

// @desc    Create an insurance provider
// @route   POST /api/insurance-providers
// @access  Private/Admin
export const createInsuranceProvider = catchAsync(
  async (req: Request, res: Response) => {
    const newProvider = await providerService.createProvider(req.body);
    res.status(201).json({ status: "success", data: newProvider });
  },
);

// @desc    Update an insurance provider
// @route   PUT /api/insurance-providers/:id
// @access  Private/Admin
export const updateInsuranceProvider = catchAsync(
  async (req: Request, res: Response) => {
    const updatedProvider = await providerService.updateProvider(
      req.params.id,
      req.body,
    );
    res.status(200).json({ status: "success", data: updatedProvider });
  },
);

// @desc    Delete an insurance provider
// @route   DELETE /api/insurance-providers/:id
// @access  Private/Admin
export const deleteInsuranceProvider = catchAsync(
  async (req: Request, res: Response) => {
    await providerService.deleteProvider(req.params.id);
    res.status(204).json({ status: "success", data: null });
  },
);
