import { Request, Response } from "express";
import { catchAsync } from "../utils/catchAsync.js";
import * as policyService from "../services/policyService.js";

export const createPolicy = catchAsync(async (req: Request, res: Response) => {
  const newPolicy = await policyService.createPolicy(req.body);
  res.status(201).json({
    status: "success",
    data: {
      policy: newPolicy,
    },
  });
});

export const getAllPolicies = catchAsync(
  async (_req: Request, res: Response) => {
    const policies = await policyService.getAllPolicies();
    res.status(200).json({
      status: "success",
      results: policies.length,
      data: {
        policies,
      },
    });
  },
);

export const getPolicyById = catchAsync(async (req: Request, res: Response) => {
  const policy = await policyService.getPolicyById(req.params.id);

  if (!policy) {
    return res.status(404).json({
      status: "fail",
      message: "Policy not found",
    });
  }

  return res.status(200).json({
    status: "success",
    data: {
      policy,
    },
  });
});
