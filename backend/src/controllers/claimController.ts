import { Request, Response, NextFunction } from "express";
import * as claimService from "../services/claimService.js";
import { AppError } from "../utils/AppError.js";
import { catchAsync } from "../utils/catchAsync.js";
import {
  createClaimSchema,
  updateClaimSchema,
} from "../validations/claimValidation.js";

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

export const calculateClaimAmount = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { policyId, claimType, claimDate } = req.query as {
      policyId?: string;
      claimType?: string;
      claimDate?: string;
    };

    if (!policyId || !claimType) {
      return next(new AppError("policyId and claimType are required.", 400));
    }

    const calculation = await claimService.calculateClaimAmount(
      policyId,
      claimType,
      claimDate,
    );

    res.status(200).json({ success: true, data: calculation });
  },
);

export const getLoanDetails = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { policyId, claimDate } = req.query as {
      policyId?: string;
      claimDate?: string;
    };

    if (!policyId) {
      return next(new AppError("policyId is required.", 400));
    }

    const loanDetails = await claimService.getLoanDetailsWithCalculatedInterest(
      policyId,
      claimDate,
    );

    res.status(200).json({ success: true, data: loanDetails });
  },
);

export const addClaim = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    // Validate request body
    const validationResult = createClaimSchema.safeParse(req.body);
    if (!validationResult.success) {
      const errors = validationResult.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      return next(new AppError(errors[0].message, 400));
    }

    const newClaim = await claimService.createClaim(
      validationResult.data,
      req.user!.id,
    );
    res.status(201).json({ success: true, data: newClaim });
  },
);

export const updateClaim = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    // Validate request body
    const validationResult = updateClaimSchema.safeParse(req.body);
    if (!validationResult.success) {
      const errors = validationResult.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      return next(new AppError(errors[0].message, 400));
    }

    const updatedClaim = await claimService.updateClaimById(
      req.params.id,
      validationResult.data,
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
