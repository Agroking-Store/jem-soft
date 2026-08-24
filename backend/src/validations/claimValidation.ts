import { z } from "zod";

const CLAIM_TYPES = ["Death", "Maturity", "Surrender"] as const;
const CLAIM_STATUSES = [
  "Pending",
  "In Progress",
  "Approved",
  "Rejected",
  "Settled",
] as const;

export const createClaimSchema = z
  .object({
    policyId: z.string().min(1, "Policy is required"),
    claimantName: z.string().optional(),
    claimType: z.enum(CLAIM_TYPES, {
      errorMap: () => ({
        message: "Claim type must be: Death, Maturity, or Surrender",
      }),
    }),
    claimAmount: z.number().positive("Claim amount must be greater than 0"),
    claimDate: z.string().min(1, "Claim date is required"),
    status: z.enum(CLAIM_STATUSES).optional(),
    reasonForClaim: z.string().optional(),
    nomineeId: z.string().optional().nullable(),
    paymentType: z.enum(["NEFT", "Cheque"]),
    chequeNumber: z.string().optional(),
    chequeDate: z.string().optional(),
    bankName: z.string().optional(),
    branchName: z.string().optional(),
    chequeAmount: z.number().optional(),
    accountHolderName: z.string().optional(),
    accountNumber: z.string().optional(),
    ifscCode: z.string().optional(),
  })
  .refine((d) => d.paymentType !== "Cheque" || !!d.chequeNumber?.trim(), {
    message: "Cheque Number is required",
    path: ["chequeNumber"],
  })
  .refine((d) => d.paymentType !== "Cheque" || !!d.chequeDate?.trim(), {
    message: "Cheque Date is required",
    path: ["chequeDate"],
  })
  .refine((d) => d.paymentType !== "Cheque" || !!d.bankName?.trim(), {
    message: "Bank Name is required",
    path: ["bankName"],
  })
  .refine((d) => d.paymentType !== "Cheque" || !!d.branchName?.trim(), {
    message: "Branch Name is required",
    path: ["branchName"],
  })
  .refine(
    (d) =>
      d.paymentType !== "Cheque" ||
      (d.chequeAmount !== undefined && d.chequeAmount > 0),
    {
      message: "Cheque Amount must be greater than 0",
      path: ["chequeAmount"],
    },
  );

export const updateClaimSchema = z
  .object({
    policyId: z.string().min(1).optional(),
    claimantName: z.string().optional(),
    claimType: z.enum(CLAIM_TYPES).optional(),
    claimAmount: z.number().positive().optional(),
    claimDate: z.string().optional(),
    status: z.enum(CLAIM_STATUSES).optional(),
    reasonForClaim: z.string().optional(),
    nomineeId: z.string().optional().nullable(),
    paymentType: z.enum(["NEFT", "Cheque"]).optional(),
    chequeNumber: z.string().optional().nullable(),
    chequeDate: z.string().optional().nullable(),
    bankName: z.string().optional().nullable(),
    branchName: z.string().optional().nullable(),
    chequeAmount: z.number().optional().nullable(),
    accountHolderName: z.string().optional().nullable(),
    accountNumber: z.string().optional().nullable(),
    ifscCode: z.string().optional().nullable(),
  })
  .refine((d) => d.paymentType !== "Cheque" || !!d.chequeNumber?.trim(), {
    message: "Cheque Number is required",
    path: ["chequeNumber"],
  })
  .refine((d) => d.paymentType !== "Cheque" || !!d.chequeDate?.trim(), {
    message: "Cheque Date is required",
    path: ["chequeDate"],
  })
  .refine((d) => d.paymentType !== "Cheque" || !!d.bankName?.trim(), {
    message: "Bank Name is required",
    path: ["bankName"],
  })
  .refine((d) => d.paymentType !== "Cheque" || !!d.branchName?.trim(), {
    message: "Branch Name is required",
    path: ["branchName"],
  })
  .refine(
    (d) =>
      d.paymentType !== "Cheque" ||
      (d.chequeAmount != null && d.chequeAmount > 0),
    {
      message: "Cheque Amount must be greater than 0",
      path: ["chequeAmount"],
    },
  );
