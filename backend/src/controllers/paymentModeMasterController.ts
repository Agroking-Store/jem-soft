import { Request, Response } from "express";
import { catchAsync } from "../utils/catchAsync.js";
import * as paymentModeMasterService from "../services/paymentModeMasterService.js";

export const getAllPaymentModes = catchAsync(
  async (_req: Request, res: Response) => {
    const modes = await paymentModeMasterService.getAllPaymentModes();
    res.status(200).json({
      status: "success",
      results: modes.length,
      data: {
        modes,
      },
    });
  }
);