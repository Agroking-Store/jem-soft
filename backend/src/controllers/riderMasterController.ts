import { Request, Response } from "express";
import { catchAsync } from "../utils/catchAsync.js";
import * as riderMasterService from "../services/riderMasterService.js";
import { AppError } from "../utils/AppError.js";

export const createRiderMaster = catchAsync(async (req: Request, res: Response) => {
  const newRider = await riderMasterService.createRiderMaster(req.body);
  res.status(201).json({
    status: "success",
    data: {
      rider: newRider,
    },
  });
});

export const getAllRiderMasters = catchAsync(async (_req: Request, res: Response) => {
  const riders = await riderMasterService.getAllRiderMasters();
  res.status(200).json({
    status: "success",
    results: riders.length,
    data: {
      riders,
    },
  });
});

export const getRiderMaster = catchAsync(async (req: Request, res: Response, next) => {
  const rider = await riderMasterService.getRiderMasterById(req.params.id);
  if (!rider) {
    return next(new AppError("No rider found with that ID", 404));
  }
  res.status(200).json({
    status: "success",
    data: {
      rider,
    },
  });
});

export const updateRiderMaster = catchAsync(async (req: Request, res: Response, next) => {
  const rider = await riderMasterService.updateRiderMaster(req.params.id, req.body);
  if (!rider) {
    return next(new AppError("No rider found with that ID", 404));
  }
  res.status(200).json({
    status: "success",
    data: {
      rider,
    },
  });
});

export const deleteRiderMaster = catchAsync(async (req: Request, res: Response, next) => {
  const rider = await riderMasterService.getRiderMasterById(req.params.id);
  if (!rider) {
    return next(new AppError("No rider found with that ID", 404));
  }
  await riderMasterService.deleteRiderMaster(req.params.id);
  res.status(204).json({
    status: "success",
    data: null,
  });
});