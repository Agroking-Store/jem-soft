import { Request, Response } from "express";
import { catchAsync } from "../utils/catchAsync.js";
import * as premiumPaymentService from "../services/premiumPaymentService.js";

export const getAllPayments = catchAsync(
  async (_req: Request, res: Response) => {
    const payments = await premiumPaymentService.getAllPayments();
    res
      .status(200)
      .json({
        status: "success",
        results: payments.length,
        data: { payments },
      });
  },
);

export const getPaymentsByPolicy = catchAsync(
  async (req: Request, res: Response) => {
    const payments = await premiumPaymentService.getPaymentsByPolicyId(
      req.params.policyId,
    );
    res
      .status(200)
      .json({
        status: "success",
        results: payments.length,
        data: { payments },
      });
  },
);

export const getPayment = catchAsync(async (req: Request, res: Response) => {
  const payment = await premiumPaymentService.getPaymentById(req.params.id);
  res.status(200).json({ status: "success", data: { payment } });
});

export const createPayment = catchAsync(async (req: Request, res: Response) => {
  const payment = await premiumPaymentService.createPayment(req.body);
  res.status(201).json({ status: "success", data: { payment } });
});

export const updatePayment = catchAsync(async (req: Request, res: Response) => {
  const payment = await premiumPaymentService.updatePayment(
    req.params.id,
    req.body,
  );
  res.status(200).json({ status: "success", data: { payment } });
});

export const markPaymentAsPaid = catchAsync(
  async (req: Request, res: Response) => {
    const payment = await premiumPaymentService.markPaymentAsPaid(
      req.params.id,
      req.body,
    );
    res.status(200).json({ status: "success", data: { payment } });
  },
);

export const deletePayment = catchAsync(async (req: Request, res: Response) => {
  await premiumPaymentService.deletePayment(req.params.id);
  res.status(204).json({ status: "success", data: null });
});
