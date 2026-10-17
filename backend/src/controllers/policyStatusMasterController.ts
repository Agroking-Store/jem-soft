import { Request, Response } from "express";
import { catchAsync } from "../utils/catchAsync.js";
import * as policyStatusMasterService from "../services/policyStatusMasterService.js";

export const getAllPolicyStatuses = catchAsync(
  async (_req: Request, res: Response) => {
    const statuses = await policyStatusMasterService.getAllPolicyStatuses();
    res.status(200).json({
      status: "success",
      results: statuses.length,
      data: {
        statuses,
      },
    });
  }
);