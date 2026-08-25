import { Request, Response } from "express";
import * as repaymentService from "../services/loanRepaymentService.js";

export const getRepayments = async (req: Request, res: Response) => {
  try {
    const repayments = await repaymentService.getRepaymentsByLoanId(
      req.params.loanId,
    );
    res.status(200).json({ success: true, data: repayments });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createRepayment = async (req: Request, res: Response) => {
  try {
    const { repaymentDate, repaymentAmount, paymentMode } = req.body;

    if (!repaymentDate || !repaymentAmount || !paymentMode) {
      res.status(400).json({
        success: false,
        message: "repaymentDate, repaymentAmount and paymentMode are required",
      });
      return;
    }

    const repayment = await repaymentService.createRepayment(
      req.params.loanId,
      req.body,
    );
    res.status(201).json({ success: true, data: repayment });
  } catch (error: any) {
    const status = error.message.includes("not found")
      ? 404
      : error.message.includes("Cannot")
        ? 400
        : error.message.includes("exceeds")
          ? 400
          : 500;
    res.status(status).json({ success: false, message: error.message });
  }
};
