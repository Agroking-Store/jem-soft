import { Request, Response, NextFunction } from "express";
import { catchAsync } from "../utils/catchAsync.js";
import * as licBranchService from "../services/licBranchService.js";
import { AppError } from "../utils/AppError.js";

export const createLicBranch = catchAsync(async (req: Request, res: Response) => {
  const newBranch = await licBranchService.createLicBranch(req.body);
  res.status(201).json({
    status: "success",
    data: {
      branch: newBranch,
    },
  });
});

export const getAllLicBranches = catchAsync(async (_req: Request, res: Response) => {
  const branches = await licBranchService.getAllLicBranches();
  res.status(200).json({
    status: "success",
    results: branches.length,
    data: {
      branches,
    },
  });
});

export const getLicBranch = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const branch = await licBranchService.getLicBranchById(req.params.id);
  if (!branch) {
    return next(new AppError("No branch found with that ID", 404));
  }
  res.status(200).json({
    status: "success",
    data: {
      branch,
    },
  });
});

export const updateLicBranch = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const branch = await licBranchService.updateLicBranch(req.params.id, req.body);
  res.status(200).json({
    status: "success",
    data: {
      branch,
    },
  });
});

export const deleteLicBranch = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  await licBranchService.deleteLicBranch(req.params.id);
  res.status(204).json({
    status: "success",
    data: null,
  });
});