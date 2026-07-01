import { Request, Response } from "express";
import { catchAsync } from "../utils/catchAsync.js";
import * as advisorService from "../services/advisorService.js";

export const getAllAdvisors = catchAsync(
  async (_req: Request, res: Response) => {
    const advisors = await advisorService.getAllAdvisors();
    res.status(200).json({
      status: "success",
      results: advisors.length,
      data: {
        advisors,
      },
    });
  }
);