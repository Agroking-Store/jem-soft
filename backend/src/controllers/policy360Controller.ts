import { Request, Response } from "express";
import { catchAsync } from "../utils/catchAsync.js";
import * as policy360Service from "../services/policy360Service.js";

export const getLapsedPolicies = catchAsync(
  async (req: Request, res: Response) => {
    const search =
      typeof req.query.search === "string" ? req.query.search : undefined;

    const lapsedPolicies = await policy360Service.getLapsedPolicies(search);

    res.status(200).json({
      status: "success",
      results: lapsedPolicies.length,
      data: { lapsedPolicies },
    });
  },
);
