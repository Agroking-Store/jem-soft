import { Request, Response } from "express";
import * as medicalHistoryService from "../services/medicalHistoryService.js";
import { catchAsync } from "../utils/catchAsync.js";

export const getMedicalHistoriesByMember = catchAsync(async (req: Request, res: Response) => {
  const memberId = req.params.memberId;
  const records = await medicalHistoryService.getMedicalHistoriesByMember(memberId);
  res.status(200).json({ status: "success", data: { records } });
});

export const getMedicalHistory = catchAsync(async (req: Request, res: Response) => {
  const record = await medicalHistoryService.getMedicalHistoryById(req.params.id);
  res.status(200).json({ status: "success", data: { record } });
});

export const createMedicalHistory = catchAsync(async (req: Request, res: Response) => {
  const record = await medicalHistoryService.createMedicalHistory(req.body);
  res.status(201).json({ status: "success", data: { record } });
});

export const updateMedicalHistory = catchAsync(async (req: Request, res: Response) => {
  const record = await medicalHistoryService.updateMedicalHistory(req.params.id, req.body);
  res.status(200).json({ status: "success", data: { record } });
});

export const deleteMedicalHistory = catchAsync(async (req: Request, res: Response) => {
  await medicalHistoryService.deleteMedicalHistory(req.params.id);
  res.status(204).json({ status: "success", data: null });
});