import { Request, Response } from "express";
import * as advisorService from "../services/advisorService.js";
import { catchAsync } from "../utils/catchAsync.js";

export const getAllAdvisors = catchAsync(
  async (_req: Request, res: Response) => {
    const advisors = await advisorService.getAdvisors();
    res.status(200).json({ status: "success", data: { advisors } });
  },
);

export const getAdvisor = catchAsync(async (req: Request, res: Response) => {
  const advisor = await advisorService.getAdvisorById(req.params.id);
  res.status(200).json({ status: "success", data: { advisor } });
});

export const createAdvisor = catchAsync(async (req: Request, res: Response) => {
  const advisor = await advisorService.createAdvisor(req.body);
  res.status(201).json({ status: "success", data: { advisor } });
});

export const updateAdvisor = catchAsync(async (req: Request, res: Response) => {
  const advisor = await advisorService.updateAdvisor(req.params.id, req.body);
  res.status(200).json({ status: "success", data: { advisor } });
});

export const deleteAdvisor = catchAsync(async (req: Request, res: Response) => {
  await advisorService.deleteAdvisor(req.params.id);
  res.status(204).json({ status: "success", data: null });
});
