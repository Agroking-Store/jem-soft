import { Request, Response, NextFunction } from "express";
import { catchAsync } from "../utils/catchAsync.js";
import * as agencyService from "../services/agencyService.js";
import { AppError } from "../utils/AppError.js";

export const createAgency = catchAsync(async (req: Request, res: Response) => {
  const newAgency = await agencyService.createAgency(req.body);
  res.status(201).json({
    status: "success",
    data: {
      agency: newAgency,
    },
  });
});

export const getAllAgencies = catchAsync(async (_req: Request, res: Response) => {
  const agencies = await agencyService.getAllAgencies();
  res.status(200).json({
    status: "success",
    results: agencies.length,
    data: {
      agencies,
    },
  });
});

export const getAgency = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const agency = await agencyService.getAgencyById(req.params.id);
  if (!agency) {
    return next(new AppError("No agency found with that ID", 404));
  }
  res.status(200).json({
    status: "success",
    data: {
      agency,
    },
  });
});

export const updateAgency = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const agency = await agencyService.updateAgency(req.params.id, req.body);
  res.status(200).json({
    status: "success",
    data: {
      agency,
    },
  });
});

export const deleteAgency = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  await agencyService.deleteAgency(req.params.id);
  res.status(204).json({
    status: "success",
    data: null,
  });
});