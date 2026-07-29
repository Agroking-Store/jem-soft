import { Request, Response, NextFunction } from "express";
import * as claimService from "../services/claimService.js";
import { AppError } from "../utils/AppError.js";
import { catchAsync } from "../utils/catchAsync.js";

export const getClaims = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const claims = await claimService.getAllClaims();
    res.status(200).json({ success: true, data: claims });
  },
);

export const getClaimById = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const claim = await claimService.getClaimById(id);

    if (!claim) {
      return next(new AppError("Claim not found.", 404));
    }

    res.status(200).json({
      status: "success",
      data: {
        claim,
      },
    });
  },
);

export const addClaim = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const newClaim = await claimService.createClaim(req.body, req.user!.id);
    res.status(201).json({ success: true, data: newClaim });
  },
);

export const updateClaim = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const updatedClaim = await claimService.updateClaimById(
      req.params.id,
      req.body,
      req.user!.id,
    );
    res.status(200).json({ success: true, data: updatedClaim });
  },
);

export const deleteClaim = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await claimService.deleteClaimById(req.params.id);
    res
      .status(200)
      .json({ success: true, message: "Claim deleted successfully" });
  },
);
