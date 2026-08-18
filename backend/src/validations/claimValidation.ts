import { z } from "zod";

export const createClaimSchema = z
  .object({
    policyId: z.string().min(1, "Policy is required"),
    claimantName: z.string().optional(),
    claimType: z.enum(["Maturity", "Death", "Surrender", "Rider", "Other"], {
      errorMap: () => ({
        message:
          "Claim type must be one of: Maturity, Death, Surrender, Rider, Other",
      }),
    }),
    claimAmount: z.number().positive("Claim amount must be greater than 0"),
    claimDate: z.string().min(1, "Claim date is required"),
    status: z.string().optional(),
    reasonForClaim: z.string().optional(),
    nomineeId: z.string().optional().nullable(),

    // Payment fields
    paymentType: z.enum(["NEFT", "Cheque"]),

    // Cheque fields (optional by default, validated conditionally)
    chequeNumber: z.string().optional(),
    chequeDate: z.string().optional(),
    bankName: z.string().optional(),
    branchName: z.string().optional(),
    chequeAmount: z.number().optional(),

    // NEFT fields
    accountHolderName: z.string().optional(),
    accountNumber: z.string().optional(),
    ifscCode: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.paymentType === "Cheque") {
        return !!data.chequeNumber && data.chequeNumber.trim().length > 0;
      }
      return true;
    },
    { message: "Cheque Number is required", path: ["chequeNumber"] },
  )
  .refine(
    (data) => {
      if (data.paymentType === "Cheque") {
        return !!data.chequeDate && data.chequeDate.trim().length > 0;
      }
      return true;
    },
    { message: "Cheque Date is required", path: ["chequeDate"] },
  )
  .refine(
    (data) => {
      if (data.paymentType === "Cheque") {
        return !!data.bankName && data.bankName.trim().length > 0;
      }
      return true;
    },
    { message: "Bank Name is required", path: ["bankName"] },
  )
  .refine(
    (data) => {
      if (data.paymentType === "Cheque") {
        return !!data.branchName && data.branchName.trim().length > 0;
      }
      return true;
    },
    { message: "Branch Name is required", path: ["branchName"] },
  )
  .refine(
    (data) => {
      if (data.paymentType === "Cheque") {
        return data.chequeAmount !== undefined && data.chequeAmount > 0;
      }
      return true;
    },
    {
      message: "Cheque Amount is required and must be greater than 0",
      path: ["chequeAmount"],
    },
  );

export const updateClaimSchema = z
  .object({
    policyId: z.string().min(1, "Policy is required").optional(),
    claimantName: z.string().optional(),
    claimType: z
      .enum(["Maturity", "Death", "Surrender", "Rider", "Other"], {
        errorMap: () => ({
          message:
            "Claim type must be one of: Maturity, Death, Surrender, Rider, Other",
        }),
      })
      .optional(),
    claimAmount: z
      .number()
      .positive("Claim amount must be greater than 0")
      .optional(),
    claimDate: z.string().optional(),
    status: z.string().optional(),
    reasonForClaim: z.string().optional(),
    nomineeId: z.string().optional().nullable(),

    // Payment fields
    paymentType: z.enum(["NEFT", "Cheque"]).optional(),

    // Cheque fields
    chequeNumber: z.string().optional().nullable(),
    chequeDate: z.string().optional().nullable(),
    bankName: z.string().optional().nullable(),
    branchName: z.string().optional().nullable(),
    chequeAmount: z.number().optional().nullable(),

    // NEFT fields
    accountHolderName: z.string().optional().nullable(),
    accountNumber: z.string().optional().nullable(),
    ifscCode: z.string().optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.paymentType === "Cheque") {
        return (
          data.chequeNumber !== undefined &&
          data.chequeNumber !== null &&
          data.chequeNumber.trim().length > 0
        );
      }
      return true;
    },
    { message: "Cheque Number is required", path: ["chequeNumber"] },
  )
  .refine(
    (data) => {
      if (data.paymentType === "Cheque") {
        return (
          data.chequeDate !== undefined &&
          data.chequeDate !== null &&
          data.chequeDate.trim().length > 0
        );
      }
      return true;
    },
    { message: "Cheque Date is required", path: ["chequeDate"] },
  )
  .refine(
    (data) => {
      if (data.paymentType === "Cheque") {
        return (
          data.bankName !== undefined &&
          data.bankName !== null &&
          data.bankName.trim().length > 0
        );
      }
      return true;
    },
    { message: "Bank Name is required", path: ["bankName"] },
  )
  .refine(
    (data) => {
      if (data.paymentType === "Cheque") {
        return (
          data.branchName !== undefined &&
          data.branchName !== null &&
          data.branchName.trim().length > 0
        );
      }
      return true;
    },
    { message: "Branch Name is required", path: ["branchName"] },
  )
  .refine(
    (data) => {
      if (data.paymentType === "Cheque") {
        return (
          data.chequeAmount !== undefined &&
          data.chequeAmount !== null &&
          data.chequeAmount > 0
        );
      }
      return true;
    },
    {
      message: "Cheque Amount is required and must be greater than 0",
      path: ["chequeAmount"],
    },
  );
