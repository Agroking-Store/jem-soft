import { Request, Response } from "express";
import { catchAsync } from "../utils/catchAsync.js";
import * as premiumModeMasterService from "../services/premiumModeMasterService.js";

export const getAllPremiumModes = catchAsync(
  async (_req: Request, res: Response) => {
    const modes = await premiumModeMasterService.getAllPremiumModes();
    res.status(200).json({
      status: "success",
      results: modes.length,
      data: {
        modes,
      },
    });
  }
);