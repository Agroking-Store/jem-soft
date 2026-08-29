import { Request, Response } from "express";
import * as loanService from "../services/loanService.js";

export const getLoans = async (req: Request, res: Response) => {
  try {
    const loans = await loanService.getAllLoans();
    res.status(200).json({ success: true, data: loans });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getLoan = async (req: Request, res: Response) => {
  try {
    const loan = await loanService.getLoanById(req.params.id);

    if (!loan) {
      res.status(404).json({ success: false, message: "Loan not found" });
      return;
    }

    res.status(200).json({ success: true, data: loan });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const addLoan = async (req: Request, res: Response) => {
  try {
    const { policyId, loanAmount, interestRate, loanDate, loanStatusId } =
      req.body;

    if (
      !policyId ||
      !loanAmount ||
      !interestRate ||
      !loanDate ||
      !loanStatusId
    ) {
      res.status(400).json({
        success: false,
        message:
          "policyId, loanAmount, interestRate, loanDate and loanStatusId are required",
      });
      return;
    }

    const newLoan = await loanService.createLoan(req.body);
    res.status(201).json({ success: true, data: newLoan });
  } catch (error: any) {
    const status = error.message.includes("already has an active loan")
      ? 409
      : 500;
    res.status(status).json({ success: false, message: error.message });
  }
};

export const updateLoan = async (req: Request, res: Response) => {
  try {
    const updatedLoan = await loanService.updateLoanById(
      req.params.id,
      req.body,
    );
    res.status(200).json({ success: true, data: updatedLoan });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteLoan = async (req: Request, res: Response) => {
  try {
    await loanService.deleteLoanById(req.params.id);
    res
      .status(200)
      .json({ success: true, message: "Loan deleted successfully" });
  } catch (error: any) {
    const status = error.message.includes("Cannot delete") ? 400 : 500;
    res.status(status).json({ success: false, message: error.message });
  }
};
