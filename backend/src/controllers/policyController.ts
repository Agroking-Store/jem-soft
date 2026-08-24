import { Request, Response, NextFunction } from "express";
import { catchAsync } from "../utils/catchAsync.js";
import * as policyService from "../services/policyService.js";
import { calculatePremium } from "../services/premiumCalculationService.js";
import { AppError } from "../utils/AppError.js";

export const createPolicy = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const newPolicy = await policyService.createPolicy(req.body);
    res.status(201).json({
      status: "success",
      data: {
        policy: newPolicy,
      },
    });
  }
);

export const previewPremium = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { productId, age, secondaryAge, option,policyTerm, premiumPayingTerm, sumAssured, premiumMode } = req.body;

    if (!productId || !age || !policyTerm || !sumAssured || !premiumMode) {
      throw new AppError("Product, age, term, sum assured, and mode are required.", 400);
    }

    const premium = await calculatePremium({
      productId,
      age: Number(age),
      secondaryAge:
        secondaryAge !== undefined &&
        secondaryAge !== null &&
        secondaryAge !== ""
          ? Number(secondaryAge)
          : null,
      option:
        option !== undefined &&
        option !== null &&
        option !== ""
          ? Number(option)
          : null,
      policyTerm: Number(policyTerm),
      premiumPayingTerm: premiumPayingTerm ? Number(premiumPayingTerm) : null,
      sumAssured: Number(sumAssured),
      premiumMode,
    });

    res.status(200).json({
      status: "success",
      data: {
        premium,
      },
    });
  }
);

export const getAllPolicies = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const policies = await policyService.getAllPolicies();
    res.status(200).json({
      status: "success",
      results: policies.length,
      data: {
        policies,
      },
    });
  }
);

export const deletePolicy = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    // The service function already checks for existence and throws an error.
    // So we don't need to check here again.
    await policyService.deletePolicy(req.params.id);

    res.status(204).json({
      status: "success",
      data: null,

     });
  }
);

export const getPolicyById = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const policy = await policyService.getPolicyById(id);

    res.status(200).json({
      status: "success",
      data: {
        policy,
      },
    });
  }
);

export const getPoliciesByMember = catchAsync(
  async (req: Request, res: Response) => {
    const { memberId } = req.params;
    const policies = await policyService.getPoliciesByMember(memberId);
    res.status(200).json({
      status: "success",
      results: policies.length,
      data: {
        policies,
      },
    });
  }
);

export const updatePolicy = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const updatedPolicy = await policyService.updatePolicy(
      id,
      req.body
    );

    res.status(200).json({
      status: "success",
      data: {
        policy: updatedPolicy,
      },
    });
  }
);