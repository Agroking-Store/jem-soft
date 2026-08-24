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
  },
);

export const previewPremium = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { productId, age, secondaryAge, option,policyTerm, premiumPayingTerm, sumAssured, premiumMode } = req.body;

    if (!productId || !age || !policyTerm || !sumAssured || !premiumMode) {
      throw new AppError(
        "Product, age, term, sum assured, and mode are required.",
        400,
      );
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
  },
);

export const getAllPolicies = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const {
      search,
      holderName,
      policyNumber,
      planName,
      groupCode,
      premium,
      dueDate,
      sumAssured,
      status,
      page,
      limit,
    } = req.query;
    const policies = await policyService.getAllPolicies({
      search: typeof search === "string" ? search : undefined,
      holderName: typeof holderName === "string" ? holderName : undefined,
      policyNumber: typeof policyNumber === "string" ? policyNumber : undefined,
      planName: typeof planName === "string" ? planName : undefined,
      groupCode: typeof groupCode === "string" ? groupCode : undefined,
      premium: typeof premium === "string" ? premium : undefined,
      dueDate: typeof dueDate === "string" ? dueDate : undefined,
      sumAssured: typeof sumAssured === "string" ? sumAssured : undefined,
      status: typeof status === "string" ? status : undefined,
    });
    const hasPagination = page !== undefined || limit !== undefined;
    const pageNumber = Math.max(Number(page) || 1, 1);
    const limitNumber = Math.max(Number(limit) || policies.length || 1, 1);
    const paginatedPolicies = hasPagination
      ? policies.slice((pageNumber - 1) * limitNumber, pageNumber * limitNumber)
      : policies;

    res.status(200).json({
      status: "success",
      results: paginatedPolicies.length,
      data: {
        policies: paginatedPolicies,
      },
    });
  },
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
  },
);

export const getPolicyById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const policy = await policyService.getPolicyById(id);

  res.status(200).json({
    status: "success",
    data: {
      policy,
    },
  });
});

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
  },
);

export const updatePolicy = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  console.log("updatePolicy controller - req.params.id:", id);
  console.log("updatePolicy controller - req.body:", req.body);

  const updatedPolicy = await policyService.updatePolicy(id, req.body);
  const refreshedPolicy = await policyService.getPolicyById(updatedPolicy.id);

  res.status(200).json({
    status: "success",
    data: {
      policy: refreshedPolicy,
    },
  });
});
