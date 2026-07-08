import { Request, Response } from "express";
import * as familyHistoryService from "../services/familyHistoryService.js";
import { catchAsync } from "../utils/catchAsync.js";

export const getAllFamilyHistories = catchAsync(async (_req: Request, res: Response) => {
  const records = await familyHistoryService.getFamilyHistories();
  res.status(200).json({ status: "success", data: { records } });
});

export const getFamilyHistory = catchAsync(async (req: Request, res: Response) => {
  const record = await familyHistoryService.getFamilyHistoryById(req.params.id);
  res.status(200).json({ status: "success", data: { record } });
});

export const createFamilyHistory = catchAsync(async (req: Request, res: Response) => {
  const record = await familyHistoryService.createFamilyHistory(req.body);
  res.status(201).json({ status: "success", data: { record } });
});

export const updateFamilyHistory = catchAsync(async (req: Request, res: Response) => {
  const record = await familyHistoryService.updateFamilyHistory(req.params.id, req.body);
  res.status(200).json({ status: "success", data: { record } });
});

export const deleteFamilyHistory = catchAsync(async (req: Request, res: Response) => {
  await familyHistoryService.deleteFamilyHistory(req.params.id);
  res.status(204).json({ status: "success", data: null });
});
