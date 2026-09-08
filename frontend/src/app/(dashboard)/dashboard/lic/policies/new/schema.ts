import { z } from "zod";

export const riderSchema = z.object({
  description: z.string().min(1, "Description is required"),

  sum: z.preprocess(
    (val) => (val === "" ? null : val),
    z.coerce.number().positive("Must be positive").nullable(),
  ),

  term: z.preprocess(
    (val) => (val === "" ? null : val),
    z.coerce.number().int().positive("Must be positive").nullable(),
  ),

  ppt: z.preprocess(
    (val) => (val === "" ? null : val),
    z.coerce.number().int().positive("Must be positive").nullable(),
  ),

  premium: z.preprocess(
    (val) => (val === "" ? null : val),
    z.coerce.number().positive("Must be positive").nullable(),
  ),
  mode: z.string().optional(),
  option: z.string().optional(),
});

export const nomineeSchema = z.object({
  nomineeName: z.string().min(1, "Nominee name is required"),
  relationship: z.string().min(1, "Relationship is required"),
  dateOfBirth: z.string().optional(),
  percentage: z.preprocess(
    (val) => (val === "" ? null : val),
    z.coerce
      .number()
      .positive("Must be positive")
      .max(100, "Cannot exceed 100")
      .nullable(),
  ),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
});

export const policySchema = z.object({
  groupId: z.string().min(1, "Group is required"),
  groupCode: z.string().optional(),
  lifeAssuredId: z.string().min(1, "Life Assured is required"),
  dob: z.string().optional(),
  age: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.coerce.number().positive("Age must be positive"),
  ),
  gender: z.string().optional(),
  pan: z.string().optional(),

  spouseId: z.string().optional(),
  option: z.string().optional(),
  spouseDob: z.string().optional(),
  spouseAge: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.coerce.number().positive("Age must be positive").optional(),
  ),
  proposerId: z.string().optional(),
  proposerDob: z.string().optional(),
  proposerAge: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.coerce.number().positive("Age must be positive").optional(),
  ),

  providerType: z.string().optional(),
  productType: z.string().optional(),
  providerId: z.string().min(1, "Provider is required"),
  policyNumber: z
    .string()
    .regex(/^\d{9}$/, "Policy number must be exactly 9 digits."),
  productId: z.string().min(1, "Plan is required"),
  mode: z.string().min(1, "Mode is required"),
  commencementDate: z.string().min(1, "Commencement date is required."),
  completionDate: z.string().min(1, "Completion date is required."),
  term: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.coerce.number().int().positive().optional(),
  ),
  ppt: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.coerce.number().int().positive().optional(),
  ),
  extraClass: z.string().optional(),
  ratePercent: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.coerce.number().positive().optional(),
  ),

  sumAssured: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.coerce.number().positive().optional(),
  ),
  basicYearlyPremium: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.coerce.number().positive().optional(),
  ),
  totalYearlyPremium: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.coerce.number().positive().optional(),
  ),
  totalRiderPremium: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.coerce.number().positive().optional(),
  ),
  installmentPremium: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.coerce.number().positive().optional(),
  ),
  gst: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.coerce.number().nonnegative().optional(),
  ),
  totalInstallmentPremium: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.coerce.number().positive().optional(),
  ),

  smoker: z.boolean().optional(),

  riders: z.array(riderSchema).optional(),
  nominees: z.array(nomineeSchema).optional(),

  advisorId: z.string().min(1, "Advisor is required."),
  agencyId: z.string().min(1, "Agency is required."),
  branchId: z.string().optional(),
  agentCode: z.string().optional(),
  fupDate: z.string().optional(),
  fuliDate: z.string().optional(),
  statusId: z.string().optional(),

  bankName: z.string().optional(),
  bankBranch: z.string().optional(),
  city: z.string().optional(),
  accountType: z.string().optional(),
  accountNumber: z.string().optional(),
  ifscCode: z.string().optional(),
  micrNumber: z.string().optional(),
  accountHolderName: z.string().optional(),

  neftBankName: z.string().optional(),
  neftBankBranch: z.string().optional(),
  neftAccountNumber: z.string().optional(),
  neftIfscCode: z.string().optional(),
  neftAccountHolderName: z.string().optional(),
  neftSubmissionDate: z.string().optional(),
});

export type PolicyFormValues = z.infer<typeof policySchema>;
