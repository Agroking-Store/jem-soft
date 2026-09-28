import { prisma } from "../config/database.js";
import { Policy } from "@prisma/client";
import { AppError } from "../utils/AppError.js";
import { createNotification } from "./notificationService.js";
import { NotificationType } from "@prisma/client";
import { calculatePremium } from "./premiumCalculationService.js";
import { addMonths } from "date-fns";
import {
  LAPSED_THRESHOLD_DAYS,
  LAPSED_EXCLUDED_POLICY_STATUS_CODES,
} from "../constants/lapsedPolicy.js";

interface RiderData {
  description: string;
  sum: number | null;
  term: number | null;
  ppt: number | null;
  premium: number | null;
  mode?: string;
}

interface NomineeData {
  nomineeName: string;
  relationship: string;
  dateOfBirth?: string;
  percentage?: number;
  phone?: string;
  email?: string;
  address?: string;
}

interface PolicyData {
  groupId: string;
  lifeAssuredId: string;
  age: number;

  spouseAge?: number | null;
  option?: number | null;

  productId: string;
  policyNumber: string;
  commencementDate: string;
  mode: string;

  advisorId?: string;
  agentCode?: string;
  branchId?: string;
  completionDate?: string;
  fupDate?: string;

  term?: number;
  ppt?: number;
  sumAssured?: number;
  basicYearlyPremium?: number;
  totalYearlyPremium?: number;
  installmentPremium?: number;
  totalInstallmentPremium?: number;
  totalRiderPremium?: number;
  gst?: number;
  statusId?: string;

  riders?: RiderData[];
  attributes?: { [key: string]: string | number };
  nominees?: NomineeData[];
  gender?: string;
  smoker?: boolean;
  proposerId?: string;
  spouseId?: string;
  paymentMethod?: string;
  bankName?: string;
  bankBranch?: string;
  city?: string;
  accountType?: string;
  accountNumber?: string;
  ifscCode?: string;
  micrNumber?: string;
  accountHolderName?: string;
  neftBankName?: string;
  neftBankBranch?: string;
  neftAccountNumber?: string;
  neftIfscCode?: string;
  neftAccountHolderName?: string;
  neftSubmissionDate?: string;
}

export const createPolicy = async (data: PolicyData): Promise<Policy> => {
  const {
    riders,
    totalRiderPremium,
    statusId,
    // Destructure only what's needed for this specific scope
    term,
    ppt, // Rename to avoid conflict with `sumAssured` from premium
    fupDate,
  } = data;

  const age =
    data.age !== undefined && data.age !== null ? Number(data.age) : undefined;
  const sumAssured =
    data.sumAssured !== undefined && data.sumAssured !== null
      ? Number(data.sumAssured)
      : undefined;
  const policyTerm =
    term !== undefined && term !== null ? Number(term) : undefined;
  const premiumPayingTerm =
    ppt !== undefined && ppt !== null ? Number(ppt) : null;

  if (!age || !sumAssured || !policyTerm) {
    throw new AppError(
      "Age, sum assured, and policy term are required.",
      400,
    );
  }

  // Use the provided statusId, or fall back to 'ACTIVE' if not provided
  const status = statusId
    ? await prisma.policyStatusMaster.findUnique({ where: { id: statusId } })
    : await prisma.policyStatusMaster.findFirst({
      where: { statusCode: { equals: "ACTIVE", mode: "insensitive" } },
    });

  const product = await prisma.productMaster.findUnique({
    where: { id: data.productId },
    select: {
      providerId: true,
      planNumber: true,
      provider: {
        select: {
          code: true,
        },
      },
    },
  });

  if (!product) {
    throw new AppError("Product not found.", 404);
  }

  const isLic = product.provider?.code?.toUpperCase() === "LIC";
  const isLicSinglePlan = isLic && ["717", "888", "883"].includes(product.planNumber || "");
  const targetModeName = isLicSinglePlan ? "Single" : (data.mode || "Yearly");

  const premiumMode = await prisma.premiumModeMaster.findFirst({
    where: {
      OR: [
        { modeName: { equals: targetModeName, mode: "insensitive" } },
        { modeCode: { equals: targetModeName, mode: "insensitive" } },
      ],
    },
  });


  const paymentMethodCode = (data.paymentMethod || "").toUpperCase();
  if (paymentMethodCode !== "NACH" && paymentMethodCode !== "NEFT") {
    throw new AppError("Bank mandate type must be either NACH or NEFT, and bank details are required.", 400);
  }

  if (paymentMethodCode === "NACH") {
    if (!data.bankName?.trim() || !data.accountNumber?.trim() || !data.ifscCode?.trim() || !data.accountHolderName?.trim() || !data.bankBranch?.trim()) {
      throw new AppError("All NACH bank details (Bank Name, Account Number, IFSC Code, Account Holder Name, Bank Branch) are required.", 400);
    }
  } else if (paymentMethodCode === "NEFT") {
    if (!data.neftBankName?.trim() || !data.neftAccountNumber?.trim() || !data.neftIfscCode?.trim() || !data.neftAccountHolderName?.trim() || !data.neftBankBranch?.trim()) {
      throw new AppError("All NEFT bank details (Bank Name, Account Number, IFSC Code, Account Holder Name, Bank Branch) are required.", 400);
    }
  }

  let paymentMode = await prisma.paymentModeMaster.findFirst({
    where: { modeCode: { equals: paymentMethodCode, mode: "insensitive" } },
  });

  if (!paymentMode) {
    if (paymentMethodCode === "NEFT") {
      paymentMode = await prisma.paymentModeMaster.upsert({
        where: { modeCode: "NEFT" },
        update: { modeName: "NEFT", description: "NEFT payment" },
        create: { modeName: "NEFT", modeCode: "NEFT", description: "NEFT payment" },
      });
    } else if (paymentMethodCode === "NACH") {
      paymentMode = await prisma.paymentModeMaster.upsert({
        where: { modeCode: "NACH" },
        update: { modeName: "NACH", description: "NACH payment" },
        create: { modeName: "NACH", modeCode: "NACH", description: "NACH payment" },
      });
    }
  }

  //Get next premium due date
  const monthsToAdd = premiumMode?.months;
  const dueDate = new Date(data.commencementDate);
  const nextPremiumDueDate = fupDate ? new Date(fupDate) : (monthsToAdd ? addMonths(dueDate, monthsToAdd) : dueDate);

  if (!status || !premiumMode) {
    throw new Error("Default policy status or premium mode not found.");
  }

  // Check if first unpaid premium date is overdue by LAPSED_THRESHOLD_DAYS (60+ days)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const nextDueStart = new Date(nextPremiumDueDate);
  nextDueStart.setHours(0, 0, 0, 0);
  const daysOverdue = Math.floor((today.getTime() - nextDueStart.getTime()) / (1000 * 60 * 60 * 24));

  let assignedStatus = status;
  const isStatusExcluded = status && LAPSED_EXCLUDED_POLICY_STATUS_CODES.includes(status.statusCode.toUpperCase());

  if (daysOverdue >= LAPSED_THRESHOLD_DAYS && !isStatusExcluded) {
    const lapsedStatus = await prisma.policyStatusMaster.findFirst({
      where: { statusCode: { equals: "LAPSED", mode: "insensitive" } },
    });
    if (lapsedStatus) {
      assignedStatus = lapsedStatus;
    }
  }

  // Validate policy number format: LIC policies are 9 digits, others can be any valid format
  if (isLic) {
    if (!/^\d{9}$/.test(data.policyNumber)) {
      throw new AppError("Policy number must be exactly 9 digits for LIC policies.", 400);
    }
  } else {
    if (!data.policyNumber || data.policyNumber.trim().length === 0) {
      throw new AppError("Policy number is required.", 400);
    }
  }

  // Check if policyNumber already exists
  const existingPolicy = await prisma.policy.findUnique({
    where: { policyNumber: data.policyNumber },
  });
  if (existingPolicy) {
    throw new AppError(`Policy number '${data.policyNumber}' already exists. Please use a unique policy number.`, 400);
  }

  return prisma.$transaction(async (tx) => {
    const newPolicy = await tx.policy.create({
      data: {
        clientId: data.groupId,
        CustomerMasterId: data.lifeAssuredId,

        providerId: product.providerId,
        productId: data.productId,

        policyNumber: data.policyNumber,

        advisorId: data.advisorId,
        agentCode: data.agentCode,
        branchId: data.branchId,

        proposerId: data.proposerId || null,
        spouseId: data.spouseId || null,

        statusId: assignedStatus.id,
        premiumModeId: premiumMode.id,
        paymentModeId: paymentMode!.id,

        commencementDate: new Date(data.commencementDate),
        maturityDate: data.completionDate
          ? new Date(data.completionDate)
          : undefined,

        nextPremiumDueDate: nextPremiumDueDate,
        policyTerm: policyTerm,
        premiumPayingTerm: premiumPayingTerm,
      },
    });

    if (riders && riders.length > 0) {
      for (const riderData of riders) {
        if (!riderData.description || riderData.description.trim() === "") continue;

        let riderMaster = await tx.riderMaster.findFirst({
          where: {
            OR: [
              { riderName: { equals: riderData.description.trim(), mode: "insensitive" } },
              { riderCode: { equals: riderData.description.trim(), mode: "insensitive" } },
              ...(riderData.description?.toLowerCase().includes("waiver") ||
                riderData.description?.toLowerCase().includes("pwb")
                ? [{ riderCode: "WOP" }]
                : []),
              ...(riderData.description?.toLowerCase().includes("accidental") ||
                riderData.description?.toLowerCase().includes("addb")
                ? [{ riderCode: "ADDB" }]
                : []),
            ],
          },
        });

        if (!riderMaster) {
          const generatedCode =
            riderData.description
              .toUpperCase()
              .replace(/[^A-Z0-9]/g, "_")
              .slice(0, 20) + "_" + Math.random().toString(36).substring(2, 6).toUpperCase();
          riderMaster = await tx.riderMaster.create({
            data: {
              riderName: riderData.description.trim(),
              riderCode: generatedCode,
              description: riderData.description.trim(),
            },
          });
        }

        if (riderMaster) {
          await tx.policyRider.create({
            data: {
              policyId: newPolicy.id,
              riderId: riderMaster.id,
              riderAmount:
                riderData.sum !== null &&
                  riderData.sum !== undefined &&
                  !isNaN(Number(riderData.sum))
                  ? Number(riderData.sum)
                  : null,
              riderPremium:
                riderData.premium !== null &&
                  riderData.premium !== undefined &&
                  !isNaN(Number(riderData.premium))
                  ? Number(riderData.premium)
                  : null,
            },
          });
        }
      }
    }

    if (isLic) {
      const premium = await calculatePremium({
        productId: data.productId,
        age: Number(age),
        secondaryAge:
          data.spouseAge !== undefined && data.spouseAge !== null
            ? Number(data.spouseAge)
            : null,
        option:
          data.option !== undefined && data.option !== null
            ? Number(data.option)
            : null,
        policyTerm: Number(policyTerm),
        premiumPayingTerm:
          premiumPayingTerm !== undefined && premiumPayingTerm !== null
            ? Number(premiumPayingTerm)
            : null,
        sumAssured: Number(sumAssured),
        premiumMode: data.mode,
        gender: data.gender,
        smoker: data.smoker,
      });

      await tx.policyPremiumCalculation.create({
        data: {
          policyId: newPolicy.id,
          sumAssured: sumAssured ?? 0,
          option:
            data.option !== undefined && data.option !== null
              ? Number(data.option)
              : null,
          basicYearlyPremium: premium.basicYearlyPremium, // From service
          totalYearlyPremium:
            premium.basicYearlyPremium + (totalRiderPremium ?? 0),
          installmentPremium: premium.installmentPremium, // From service
          totalInstallmentPremium:
            premium.installmentPremium + (totalRiderPremium ?? 0),
          gst: premium.gst, // From service
          riderPremium: totalRiderPremium ?? 0,
        },
      });
    } else {
      // Non-LIC / Other Policy: Use manually entered premium values
      const basicYearlyPremium = Number(data.basicYearlyPremium || 0);
      const totalRiderPrem = Number(data.totalRiderPremium || 0);
      const totalYearlyPremium =
        data.totalYearlyPremium !== undefined && data.totalYearlyPremium !== null && !isNaN(Number(data.totalYearlyPremium))
          ? Number(data.totalYearlyPremium)
          : basicYearlyPremium + totalRiderPrem;
      const installmentPremium = Number(data.installmentPremium || 0);
      const totalInstallmentPremium =
        data.totalInstallmentPremium !== undefined && data.totalInstallmentPremium !== null && !isNaN(Number(data.totalInstallmentPremium))
          ? Number(data.totalInstallmentPremium)
          : installmentPremium + totalRiderPrem;
      const gst = Number(data.gst || 0);

      await tx.policyPremiumCalculation.create({
        data: {
          policyId: newPolicy.id,
          sumAssured: sumAssured ?? 0,
          option:
            data.option !== undefined && data.option !== null && !isNaN(Number(data.option))
              ? Number(data.option)
              : null,
          basicYearlyPremium: basicYearlyPremium,
          totalYearlyPremium: totalYearlyPremium,
          installmentPremium: installmentPremium,
          totalInstallmentPremium: totalInstallmentPremium,
          gst: gst,
          riderPremium: totalRiderPrem,
        },
      });
    }

    // Save Policy Attributes using values entered in the form
    if (data.attributes && Object.keys(data.attributes).length > 0) {
      const productAttributes = await tx.productAttributeMaster.findMany({
        where: {
          attributeCode: {
            in: Object.keys(data.attributes),
          },
        },
      });

      const policyAttributesToCreate = productAttributes
        .filter((attr) => data.attributes![attr.attributeCode] !== undefined)
        .map((attr) => ({
          policyId: newPolicy.id,
          attributeId: attr.id,
          value: String(data.attributes![attr.attributeCode]),
        }));

      if (policyAttributesToCreate.length > 0) {
        await tx.policyAttribute.createMany({
          data: policyAttributesToCreate,
        });
      }
    }

    if (data.nominees && data.nominees.length > 0) {
      await tx.nominee.createMany({
        data: data.nominees.map((nominee) => ({
          policyId: newPolicy.id,
          nomineeName: nominee.nomineeName,
          relationship: nominee.relationship,
          dateOfBirth: nominee.dateOfBirth
            ? new Date(nominee.dateOfBirth)
            : null,
          percentage: nominee.percentage,
          phone: nominee.phone,
          email: nominee.email,
          address: nominee.address,
        })),
      });
    }

    // If NACH/NEFT details were provided, save or update them in CustomerBankDetails
    const targetCustomerId = data.proposerId || data.lifeAssuredId;
    if (data.paymentMethod === "NACH" && (data.accountNumber || data.bankName)) {
      const existingBank = await tx.customerBankDetails.findFirst({
        where: {
          customerId: targetCustomerId,
          OR: [
            ...(data.accountNumber ? [{ accountNumber: data.accountNumber }] : []),
            ...(data.ifscCode ? [{ ifscCode: data.ifscCode }] : []),
          ],
        },
      });

      if (existingBank) {
        await tx.customerBankDetails.update({
          where: { id: existingBank.id },
          data: {
            bankName: data.bankName || existingBank.bankName,
            bankBranch: data.bankBranch || existingBank.bankBranch,
            city: data.city || existingBank.city,
            accountType: data.accountType || existingBank.accountType,
            accountNumber: data.accountNumber || existingBank.accountNumber,
            ifscCode: data.ifscCode || existingBank.ifscCode,
            micrNumber: data.micrNumber || existingBank.micrNumber,
            accountHolderName: data.accountHolderName || existingBank.accountHolderName,
          },
        });
      } else {
        await tx.customerBankDetails.create({
          data: {
            customerId: targetCustomerId,
            bankName: data.bankName || null,
            bankBranch: data.bankBranch || null,
            city: data.city || null,
            accountType: data.accountType || null,
            accountNumber: data.accountNumber || null,
            ifscCode: data.ifscCode || null,
            micrNumber: data.micrNumber || null,
            accountHolderName: data.accountHolderName || null,
            isDefault: true,
          },
        });
      }
    } else if (data.paymentMethod === "NEFT" && (data.neftAccountNumber || data.neftBankName)) {
      const existingBank = await tx.customerBankDetails.findFirst({
        where: {
          customerId: targetCustomerId,
          OR: [
            ...(data.neftAccountNumber ? [{ accountNumber: data.neftAccountNumber }] : []),
            ...(data.neftIfscCode ? [{ ifscCode: data.neftIfscCode }] : []),
          ],
        },
      });

      if (existingBank) {
        await tx.customerBankDetails.update({
          where: { id: existingBank.id },
          data: {
            bankName: data.neftBankName || existingBank.bankName,
            bankBranch: data.neftBankBranch || existingBank.bankBranch,
            accountNumber: data.neftAccountNumber || existingBank.accountNumber,
            ifscCode: data.neftIfscCode || existingBank.ifscCode,
            accountHolderName: data.neftAccountHolderName || existingBank.accountHolderName,
          },
        });
      } else {
        await tx.customerBankDetails.create({
          data: {
            customerId: targetCustomerId,
            bankName: data.neftBankName || null,
            bankBranch: data.neftBankBranch || null,
            accountNumber: data.neftAccountNumber || null,
            ifscCode: data.neftIfscCode || null,
            accountHolderName: data.neftAccountHolderName || null,
            isDefault: true,
          },
        });
      }
    }

    if (data.neftSubmissionDate) {
      let neftAttr = await tx.productAttributeMaster.findFirst({
        where: { attributeCode: { equals: "neftSubmissionDate", mode: "insensitive" } },
      });
      if (!neftAttr) {
        neftAttr = await tx.productAttributeMaster.create({
          data: {
            attributeName: "NEFT Submission Date",
            attributeCode: "neftSubmissionDate",
            dataType: "STRING",
          },
        });
      }
      await tx.policyAttribute.upsert({
        where: {
          policyId_attributeId: {
            policyId: newPolicy.id,
            attributeId: neftAttr.id,
          },
        },
        update: { value: data.neftSubmissionDate },
        create: {
          policyId: newPolicy.id,
          attributeId: neftAttr.id,
          value: data.neftSubmissionDate,
        },
      });
    }

    await createNotification(tx, {
      title: "Policy Created",
      message: `New policy (${newPolicy.policyNumber}) has been created.`,
      type: NotificationType.POLICY_CREATED,
      policyId: newPolicy.id,
    });

    if (assignedStatus.statusCode?.toUpperCase() === "LAPSED") {
      await createNotification(tx, {
        title: "Policy Lapsed",
        message: `Policy (${newPolicy.policyNumber}) has been automatically marked as Lapsed due to first unpaid premium date (${nextPremiumDueDate.toISOString().slice(0, 10)}) being overdue by ${daysOverdue} days.`,
        type: NotificationType.POLICY_LAPSED,
        policyId: newPolicy.id,
      });
    }

    // await tx.premiumPayment.create({
    //   data : {
    //     policyId : newPolicy.id,
    //     installmentNo : 1,
    //     dueDate : newPolicy.createdAt,
    //     paidDate : newPolicy.createdAt,
    //     premiumAmount: premium.installmentPremium + (totalRiderPremium ?? 0),
    //     lateFee : 0,
    //     paymentStatusId : paymentStatus!.id, //Paid status
    //     paymentMode : paymentMode?.id,
    //     paymentDetails : "Initial Payment",
    //   }
    // })

    return newPolicy;
  });
};

interface PolicySearchFilters {
  search?: string;
  holderName?: string;
  policyNumber?: string;
  planName?: string;
  groupCode?: string;
  premium?: string;
  dueDate?: string;
  sumAssured?: string;
  status?: string;
  policyAge?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export const getAllPolicies = async (
  filters: PolicySearchFilters = {},
): Promise<any[]> => {
  try {
    await checkAndAutoLapsePolicies();
  } catch (err: any) {
    console.error("⚠️ [AUTO-LAPSE IN GET ALL POLICIES ERROR]:", err.message);
  }

  const normalizedSearch = filters.search?.trim();
  const normalizedHolderName = filters.holderName?.trim();
  const normalizedPolicyNumber = filters.policyNumber?.trim();
  const normalizedPlanName = filters.planName?.trim();
  const normalizedGroupCode = filters.groupCode?.trim();
  const premium = filters.premium?.trim();
  const dueDate = filters.dueDate?.trim();
  const sumAssured = filters.sumAssured?.trim();
  const status = filters.status?.trim();
  const numericPremium = premium ? Number(premium) : undefined;
  const numericSumAssured = sumAssured ? Number(sumAssured) : undefined;
  const dueDateStart = dueDate
    ? new Date(`${dueDate}T00:00:00.000`)
    : undefined;
  const dueDateEnd = dueDateStart
    ? new Date(dueDateStart.getTime() + 24 * 60 * 60 * 1000)
    : undefined;
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const normalizedPolicyAge = filters.policyAge?.trim().toLowerCase();
  const customerNameConditions = (value: string) =>
    value
      .split(/\s+/)
      .filter(Boolean)
      .map((term) => ({
        OR: [
          {
            firstName: {
              contains: term,
              mode: "insensitive" as const,
            },
          },
          {
            middleName: {
              contains: term,
              mode: "insensitive" as const,
            },
          },
          {
            lastName: {
              contains: term,
              mode: "insensitive" as const,
            },
          },
        ],
      }));

  const where = {
    AND: [
      normalizedSearch
        ? {
          OR: [
            {
              policyNumber: {
                contains: normalizedSearch,
                mode: "insensitive" as const,
              },
            },
            {
              CustomerMaster: {
                AND: customerNameConditions(normalizedSearch),
              },
            },
            {
              customer: {
                OR: [
                  {
                    groupName: {
                      contains: normalizedSearch,
                      mode: "insensitive" as const,
                    },
                  },
                  {
                    groupCode: {
                      contains: normalizedSearch,
                      mode: "insensitive" as const,
                    },
                  },
                ],
              },
            },
            {
              product: {
                OR: [
                  {
                    planNumber: {
                      contains: normalizedSearch,
                      mode: "insensitive" as const,
                    },
                  },
                  {
                    productName: {
                      contains: normalizedSearch,
                      mode: "insensitive" as const,
                    },
                  },
                ],
              },
            },
            {
              status: {
                OR: [
                  {
                    statusName: {
                      contains: normalizedSearch,
                      mode: "insensitive" as const,
                    },
                  },
                  {
                    statusCode: {
                      contains: normalizedSearch,
                      mode: "insensitive" as const,
                    },
                  },
                ],
              },
            },
          ],
        }
        : undefined,
      normalizedHolderName
        ? {
          CustomerMaster: {
            AND: customerNameConditions(normalizedHolderName),
          },
        }
        : undefined,
      normalizedPolicyNumber
        ? {
          policyNumber: {
            contains: normalizedPolicyNumber,
            mode: "insensitive" as const,
          },
        }
        : undefined,
      normalizedPlanName
        ? {
          product: {
            OR: [
              {
                productName: {
                  contains: normalizedPlanName,
                  mode: "insensitive" as const,
                },
              },
              {
                planNumber: {
                  contains: normalizedPlanName,
                  mode: "insensitive" as const,
                },
              },
            ],
          },
        }
        : undefined,
      normalizedGroupCode
        ? {
          customer: {
            groupCode: {
              contains: normalizedGroupCode,
              mode: "insensitive" as const,
            },
          },
        }
        : undefined,
      numericPremium !== undefined && Number.isFinite(numericPremium)
        ? { premium: { installmentPremium: numericPremium } }
        : undefined,
      numericSumAssured !== undefined && Number.isFinite(numericSumAssured)
        ? { premium: { sumAssured: numericSumAssured } }
        : undefined,
      dueDateStart && dueDateEnd && !Number.isNaN(dueDateStart.getTime())
        ? {
          nextPremiumDueDate: {
            gte: dueDateStart,
            lt: dueDateEnd,
          },
        }
        : undefined,
      status
        ? {
          status: {
            statusName: {
              equals: status,
              mode: "insensitive" as const,
            },
          },
        }
        : undefined,
      normalizedPolicyAge === "new"
        ? { commencementDate: { gte: oneYearAgo } }
        : normalizedPolicyAge === "old"
          ? { commencementDate: { lt: oneYearAgo } }
          : undefined,
    ].filter(Boolean),
  };

  return prisma.policy.findMany({
    where: where as any,
    include: {
      CustomerMaster: {
        include: {
          bankDetails: true,
          addresses: true,
          contactInfo: true,
          miscInfo: true,
          familyHistories: {
            include: { records: true },
          },
          medicalHistories: {
            include: { records: true },
          },
        },
      },
      customer: true,
      provider: true,
      product: true,
      status: true,
      premiumMode: true,
      paymentMode: true,
      premium: true,
      branch: true,
      advisor: {
        include: {
          agency: true,
        },
      },
      loans: {
        include: {
          loanStatus: true,
        },
      },
      nominees: true,
      proposer: {
        include: {
          bankDetails: true,
        },
      },
      spouse: true,
      policyAttributes: {
        include: {
          attribute: true,
        },
      },
      policyRiders: true,
    },
    orderBy: {
      createdAt:
        filters.sortOrder === "asc" || filters.sortBy === "oldest"
          ? "asc"
          : "desc",
    },
  });
};

export const deletePolicy = async (policyId: string): Promise<Policy> => {
  // Check if policy exists
  const policy = await prisma.policy.findUnique({
    where: {
      id: policyId,
    },
  });

  if (!policy) {
    throw new Error("Policy not found.");
  }

  return prisma.$transaction(async (tx) => {
    // Delete related premium calculations
    await tx.policyPremiumCalculation.deleteMany({
      where: {
        policyId,
      },
    });

    // Delete related riders
    await tx.policyRider.deleteMany({
      where: {
        policyId,
      },
    });

    // Delete Policy Loan
    await tx.policyLoan.deleteMany({
      where: {
        policyId,
      },
    });

    //Delete Policy Attribute
    await tx.policyAttribute.deleteMany({
      where: {
        policyId,
      },
    });

    //Delete Nominne
    await tx.nominee.deleteMany({
      where: {
        policyId,
      },
    });

    // Delete the policy
    const deletedPolicy = await tx.policy.delete({
      where: {
        id: policyId,
      },
    });

    // Create notification
    await createNotification(tx, {
      title: "Policy Deleted",
      message: `Policy (${policy.policyNumber}) has been deleted.`,
      type: NotificationType.POLICY_DELETED,
    });

    return deletedPolicy;
  });
};

export const getProductTerms = async (
  productId: string,
): Promise<{ terms: number[]; ppts: (number | null)[] }> => {
  if (!productId) {
    throw new AppError("Product ID is required.", 400);
  }

  const rates = await prisma.productPremiumRate.findMany({
    where: {
      productId: productId,
    },
    select: {
      policyTerm: true,
      premiumPayingTerm: true,
    },
    distinct: ["policyTerm", "premiumPayingTerm"],
  });

  if (rates.length === 0) {
    return { terms: [], ppts: [] };
  }

  const terms = [...new Set(rates.map((r) => r.policyTerm))].sort(
    (a, b) => a - b,
  );
  const ppts = [...new Set(rates.map((r) => r.premiumPayingTerm))].sort(
    (a, b) => (a === null ? -1 : b === null ? 1 : a - b),
  );

  return {
    terms,
    ppts,
  };
};

export const getPoliciesByMember = async (memberId: string): Promise<any[]> => {
  return prisma.policy.findMany({
    where: { CustomerMasterId: memberId },
    include: {
      CustomerMaster: {
        include: {
          bankDetails: true,
        },
      },
      customer: true,
      provider: true,
      product: true,
      status: true,
      premiumMode: true,
      premium: true,
      nominees: true,
    },
    orderBy: { commencementDate: "desc" },
  });
};

export const getPolicyById = async (id: string): Promise<any> => {
  return prisma.policy.findUnique({
    where: {
      id,
    },
    include: {
      CustomerMaster: {
        include: {
          bankDetails: true,
        },
      },
      proposer: {
        include: {
          bankDetails: true,
        },
      },
      spouse: true,
      customer: true,
      provider: true,
      product: true,
      status: true,
      premiumMode: true,
      paymentMode: true,
      premium: true,
      branch: true,
      advisor: {
        include: {
          agency: true,
        },
      },
      nominees: true,
      policyRiders: {
        include: {
          rider: true,
        },
      },
      policyAttributes: {
        include: {
          attribute: true,
        },
      },
    },
  });
};
export const updatePolicy = async (
  id: string,
  data: PolicyData,
): Promise<Policy> => {
  const { riders, totalRiderPremium, attributes } = data;

  const age =
    data.age !== undefined && data.age !== null ? Number(data.age) : undefined;
  const sumAssured =
    data.sumAssured !== undefined && data.sumAssured !== null
      ? Number(data.sumAssured)
      : undefined;
  const policyTerm =
    data.term !== undefined && data.term !== null
      ? Number(data.term)
      : undefined;
  const premiumPayingTerm =
    data.ppt !== undefined && data.ppt !== null ? Number(data.ppt) : null;

  if (!age || !sumAssured || !policyTerm) {
    throw new AppError(
      "Age, sum assured, and policy term are required to calculate premium.",
      400,
    );
  }

  const product = await prisma.productMaster.findUnique({
    where: { id: data.productId },
    select: {
      providerId: true,
      planNumber: true,
      provider: {
        select: {
          code: true,
        },
      },
    },
  });

  if (!product) {
    throw new AppError("Product not found.", 404);
  }

  const isLic = product.provider?.code?.toUpperCase() === "LIC";
  const isLicSinglePlan = isLic && ["717", "888", "883"].includes(product.planNumber || "");
  const targetModeName = isLicSinglePlan ? "Single" : (data.mode || "Yearly");

  const premiumMode = await prisma.premiumModeMaster.findFirst({
    where: {
      OR: [
        { modeName: { equals: targetModeName, mode: "insensitive" } },
        { modeCode: { equals: targetModeName, mode: "insensitive" } },
      ],
    },
  });

  if (!premiumMode) {
    throw new Error("Premium mode not found.");
  }

  const updatedNextDueDate = data.fupDate ? new Date(data.fupDate) : null;
  let finalStatusId = data.statusId;

  if (updatedNextDueDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(updatedNextDueDate);
    due.setHours(0, 0, 0, 0);
    const daysOverdue = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));

    if (daysOverdue >= LAPSED_THRESHOLD_DAYS) {
      const requestedStatus = data.statusId
        ? await prisma.policyStatusMaster.findUnique({ where: { id: data.statusId } })
        : null;
      const isExcluded = requestedStatus && LAPSED_EXCLUDED_POLICY_STATUS_CODES.includes(requestedStatus.statusCode.toUpperCase());
      if (!isExcluded) {
        const lapsedStatus = await prisma.policyStatusMaster.findFirst({
          where: { statusCode: { equals: "LAPSED", mode: "insensitive" } },
        });
        if (lapsedStatus) {
          finalStatusId = lapsedStatus.id;
        }
      }
    }
  }

  if (data.policyNumber) {
    const existingWithNumber = await prisma.policy.findFirst({
      where: {
        policyNumber: data.policyNumber,
        NOT: { id },
      },
    });
    if (existingWithNumber) {
      throw new AppError(`Policy number '${data.policyNumber}' already exists. Please use a unique policy number.`, 400);
    }
  }

  const updatePaymentMethodCode = (data.paymentMethod || "").toUpperCase();
  if (updatePaymentMethodCode !== "NACH" && updatePaymentMethodCode !== "NEFT") {
    throw new AppError("Bank mandate type must be either NACH or NEFT, and bank details are required.", 400);
  }

  if (updatePaymentMethodCode === "NACH") {
    if (!data.bankName?.trim() || !data.accountNumber?.trim() || !data.ifscCode?.trim() || !data.accountHolderName?.trim() || !data.bankBranch?.trim()) {
      throw new AppError("All NACH bank details (Bank Name, Account Number, IFSC Code, Account Holder Name, Bank Branch) are required.", 400);
    }
  } else if (updatePaymentMethodCode === "NEFT") {
    if (!data.neftBankName?.trim() || !data.neftAccountNumber?.trim() || !data.neftIfscCode?.trim() || !data.neftAccountHolderName?.trim() || !data.neftBankBranch?.trim()) {
      throw new AppError("All NEFT bank details (Bank Name, Account Number, IFSC Code, Account Holder Name, Bank Branch) are required.", 400);
    }
  }

  let paymentModeRecord = await prisma.paymentModeMaster.findFirst({
    where: { modeCode: { equals: updatePaymentMethodCode, mode: "insensitive" } },
  });
  if (!paymentModeRecord) {
    if (updatePaymentMethodCode === "NEFT") {
      paymentModeRecord = await prisma.paymentModeMaster.upsert({
        where: { modeCode: "NEFT" },
        update: { modeName: "NEFT", description: "NEFT payment" },
        create: { modeName: "NEFT", modeCode: "NEFT", description: "NEFT payment" },
      });
    } else if (updatePaymentMethodCode === "NACH") {
      paymentModeRecord = await prisma.paymentModeMaster.upsert({
        where: { modeCode: "NACH" },
        update: { modeName: "NACH", description: "NACH payment" },
        create: { modeName: "NACH", modeCode: "NACH", description: "NACH payment" },
      });
    }
  }

  return prisma.$transaction(async (tx) => {
    const updatedPolicy = await tx.policy.update({
      where: {
        id,
      },
      data: {
        clientId: data.groupId,
        CustomerMasterId: data.lifeAssuredId,

        providerId: product.providerId,
        productId: data.productId,

        policyNumber: data.policyNumber,

        advisorId: data.advisorId || null,
        agentCode: data.agentCode,
        branchId: data.branchId || null,

        proposerId: data.proposerId || null,
        spouseId: data.spouseId || null,

        premiumModeId: premiumMode.id,
        paymentModeId: paymentModeRecord!.id,

        commencementDate: new Date(data.commencementDate),

        maturityDate: data.completionDate
          ? new Date(data.completionDate)
          : null,

        policyTerm: data.term,

        premiumPayingTerm: premiumPayingTerm,

        statusId: finalStatusId,

        nextPremiumDueDate: updatedNextDueDate,
      },
    });

    // Delete old riders
    await tx.policyRider.deleteMany({
      where: {
        policyId: id,
      },
    });

    // Insert new riders
    if (riders && riders.length > 0) {
      for (const riderData of riders) {
        if (!riderData.description || riderData.description.trim() === "") continue;

        let riderMaster = await tx.riderMaster.findFirst({
          where: {
            OR: [
              { riderName: { equals: riderData.description.trim(), mode: "insensitive" } },
              { riderCode: { equals: riderData.description.trim(), mode: "insensitive" } },
              ...(riderData.description?.toLowerCase().includes("waiver") ||
                riderData.description?.toLowerCase().includes("pwb")
                ? [{ riderCode: "WOP" }]
                : []),
              ...(riderData.description?.toLowerCase().includes("accidental") ||
                riderData.description?.toLowerCase().includes("addb")
                ? [{ riderCode: "ADDB" }]
                : []),
            ],
          },
        });

        if (!riderMaster) {
          const generatedCode =
            riderData.description
              .toUpperCase()
              .replace(/[^A-Z0-9]/g, "_")
              .slice(0, 20) + "_" + Math.random().toString(36).substring(2, 6).toUpperCase();
          riderMaster = await tx.riderMaster.create({
            data: {
              riderName: riderData.description.trim(),
              riderCode: generatedCode,
              description: riderData.description.trim(),
            },
          });
        }

        if (riderMaster) {
          await tx.policyRider.create({
            data: {
              policyId: id,
              riderId: riderMaster.id,
              riderAmount:
                riderData.sum !== null &&
                  riderData.sum !== undefined &&
                  !isNaN(Number(riderData.sum))
                  ? Number(riderData.sum)
                  : null,
              riderPremium:
                riderData.premium !== null &&
                  riderData.premium !== undefined &&
                  !isNaN(Number(riderData.premium))
                  ? Number(riderData.premium)
                  : null,
            },
          });
        }
      }
    }

    // Update Nominees
    await tx.nominee.deleteMany({
      where: {
        policyId: id,
      },
    });

    if (data.nominees && data.nominees.length > 0) {
      await tx.nominee.createMany({
        data: data.nominees.map((nominee) => ({
          policyId: id,
          nomineeName: nominee.nomineeName,
          relationship: nominee.relationship,
          dateOfBirth: nominee.dateOfBirth
            ? new Date(nominee.dateOfBirth)
            : null,
          percentage: nominee.percentage,
          phone: nominee.phone,
          email: nominee.email,
          address: nominee.address,
        })),
      });
    }

    // Update Premium Calculation
    if (isLic) {
      const premium = await calculatePremium({
        productId: data.productId,
        age: Number(data.age),
        secondaryAge: data.spouseAge != null ? Number(data.spouseAge) : null,
        option: data.option != null ? Number(data.option) : null,
        policyTerm: Number(data.term),
        premiumPayingTerm:
          data.ppt !== undefined && data.ppt !== null ? Number(data.ppt) : null,
        sumAssured: Number(data.sumAssured),
        premiumMode: data.mode,
        gender: data.gender,
        smoker: data.smoker,
      });
      await tx.policyPremiumCalculation.upsert({
        where: {
          policyId: id,
        },
        update: {
          sumAssured: sumAssured ?? 0,
          option:
            data.option !== undefined && data.option !== null
              ? Number(data.option)
              : null,
          basicYearlyPremium: premium.basicYearlyPremium,
          totalYearlyPremium:
            premium.basicYearlyPremium + (totalRiderPremium ?? 0),
          installmentPremium: premium.installmentPremium,
          totalInstallmentPremium:
            premium.installmentPremium + (totalRiderPremium ?? 0),
          gst: premium.gst,
          riderPremium: totalRiderPremium ?? 0,
        },
        create: {
          policyId: id,
          sumAssured: sumAssured ?? 0,
          option:
            data.option !== undefined && data.option !== null
              ? Number(data.option)
              : null,
          basicYearlyPremium: premium.basicYearlyPremium,
          totalYearlyPremium:
            premium.basicYearlyPremium + (totalRiderPremium ?? 0),
          installmentPremium: premium.installmentPremium,
          totalInstallmentPremium:
            premium.installmentPremium + (totalRiderPremium ?? 0),
          gst: premium.gst,
          riderPremium: totalRiderPremium ?? 0,
        },
      });
    } else {
      const basicYearlyPremium = Number(data.basicYearlyPremium || 0);
      const totalRiderPrem = Number(data.totalRiderPremium || 0);
      const totalYearlyPremium =
        data.totalYearlyPremium !== undefined && data.totalYearlyPremium !== null && !isNaN(Number(data.totalYearlyPremium))
          ? Number(data.totalYearlyPremium)
          : basicYearlyPremium + totalRiderPrem;
      const installmentPremium = Number(data.installmentPremium || 0);
      const totalInstallmentPremium =
        data.totalInstallmentPremium !== undefined && data.totalInstallmentPremium !== null && !isNaN(Number(data.totalInstallmentPremium))
          ? Number(data.totalInstallmentPremium)
          : installmentPremium + totalRiderPrem;
      const gst = Number(data.gst || 0);

      await tx.policyPremiumCalculation.upsert({
        where: {
          policyId: id,
        },
        update: {
          sumAssured: sumAssured ?? 0,
          option:
            data.option !== undefined && data.option !== null && !isNaN(Number(data.option))
              ? Number(data.option)
              : null,
          basicYearlyPremium: basicYearlyPremium,
          totalYearlyPremium: totalYearlyPremium,
          installmentPremium: installmentPremium,
          totalInstallmentPremium: totalInstallmentPremium,
          gst: gst,
          riderPremium: totalRiderPrem,
        },
        create: {
          policyId: id,
          sumAssured: sumAssured ?? 0,
          option:
            data.option !== undefined && data.option !== null && !isNaN(Number(data.option))
              ? Number(data.option)
              : null,
          basicYearlyPremium: basicYearlyPremium,
          totalYearlyPremium: totalYearlyPremium,
          installmentPremium: installmentPremium,
          totalInstallmentPremium: totalInstallmentPremium,
          gst: gst,
          riderPremium: totalRiderPrem,
        },
      });
    }

    // Update Policy Attributes
    if (attributes) {
      const productAttributes = await tx.productAttributeMaster.findMany({
        where: {
          attributeCode: {
            in: Object.keys(attributes),
          },
        },
      });

      const policyAttributes = productAttributes
        .filter((attr) => attributes[attr.attributeCode] !== undefined)
        .map((attr) => ({
          policyId: id,
          attributeId: attr.id,
          value: String(attributes[attr.attributeCode]),
        }));

      for (const attribute of policyAttributes) {
        await tx.policyAttribute.upsert({
          where: {
            policyId_attributeId: {
              policyId: attribute.policyId,
              attributeId: attribute.attributeId,
            },
          },
          update: {
            value: attribute.value,
          },
          create: attribute,
        });
      }
    }

    // If NACH/NEFT details were updated, update CustomerBankDetails
    const targetCustomerId = data.proposerId || data.lifeAssuredId;
    if (targetCustomerId) {
      if (data.paymentMethod === "NACH" && (data.accountNumber || data.bankName)) {
        const existingBank = await tx.customerBankDetails.findFirst({
          where: {
            customerId: targetCustomerId,
            OR: [
              ...(data.accountNumber ? [{ accountNumber: data.accountNumber }] : []),
              ...(data.ifscCode ? [{ ifscCode: data.ifscCode }] : []),
            ],
          },
        });

        if (existingBank) {
          await tx.customerBankDetails.update({
            where: { id: existingBank.id },
            data: {
              bankName: data.bankName || existingBank.bankName,
              bankBranch: data.bankBranch || existingBank.bankBranch,
              city: data.city || existingBank.city,
              accountType: data.accountType || existingBank.accountType,
              accountNumber: data.accountNumber || existingBank.accountNumber,
              ifscCode: data.ifscCode || existingBank.ifscCode,
              micrNumber: data.micrNumber || existingBank.micrNumber,
              accountHolderName: data.accountHolderName || existingBank.accountHolderName,
            },
          });
        } else {
          await tx.customerBankDetails.create({
            data: {
              customerId: targetCustomerId,
              bankName: data.bankName || null,
              bankBranch: data.bankBranch || null,
              city: data.city || null,
              accountType: data.accountType || null,
              accountNumber: data.accountNumber || null,
              ifscCode: data.ifscCode || null,
              micrNumber: data.micrNumber || null,
              accountHolderName: data.accountHolderName || null,
              isDefault: true,
            },
          });
        }
      } else if (data.paymentMethod === "NEFT" && (data.neftAccountNumber || data.neftBankName)) {
        const existingBank = await tx.customerBankDetails.findFirst({
          where: {
            customerId: targetCustomerId,
            OR: [
              ...(data.neftAccountNumber ? [{ accountNumber: data.neftAccountNumber }] : []),
              ...(data.neftIfscCode ? [{ ifscCode: data.neftIfscCode }] : []),
            ],
          },
        });

        if (existingBank) {
          await tx.customerBankDetails.update({
            where: { id: existingBank.id },
            data: {
              bankName: data.neftBankName || existingBank.bankName,
              bankBranch: data.neftBankBranch || existingBank.bankBranch,
              accountNumber: data.neftAccountNumber || existingBank.accountNumber,
              ifscCode: data.neftIfscCode || existingBank.ifscCode,
              accountHolderName: data.neftAccountHolderName || existingBank.accountHolderName,
            },
          });
        } else {
          await tx.customerBankDetails.create({
            data: {
              customerId: targetCustomerId,
              bankName: data.neftBankName || null,
              bankBranch: data.neftBankBranch || null,
              accountNumber: data.neftAccountNumber || null,
              ifscCode: data.neftIfscCode || null,
              accountHolderName: data.neftAccountHolderName || null,
              isDefault: true,
            },
          });
        }
      }
    }

    if (data.neftSubmissionDate) {
      let neftAttr = await tx.productAttributeMaster.findFirst({
        where: { attributeCode: { equals: "neftSubmissionDate", mode: "insensitive" } },
      });
      if (!neftAttr) {
        neftAttr = await tx.productAttributeMaster.create({
          data: {
            attributeName: "NEFT Submission Date",
            attributeCode: "neftSubmissionDate",
            dataType: "STRING",
          },
        });
      }
      await tx.policyAttribute.upsert({
        where: {
          policyId_attributeId: {
            policyId: updatedPolicy.id,
            attributeId: neftAttr.id,
          },
        },
        update: { value: data.neftSubmissionDate },
        create: {
          policyId: updatedPolicy.id,
          attributeId: neftAttr.id,
          value: data.neftSubmissionDate,
        },
      });
    }

    await createNotification(tx, {
      title: "Policy Updated",
      message: `Policy (${updatedPolicy.policyNumber}) has been updated.`,
      type: NotificationType.POLICY_UPDATED,
      policyId: updatedPolicy.id,
    });

    return updatedPolicy;
  });
};

/**
 * Automatically transitions policies whose next unpaid premium is overdue by
 * LAPSED_THRESHOLD_DAYS (60 days) or more to 'LAPSED' status.
 *
 * Excludes terminal statuses (CLAIMED, MATURITY CLAIMED, SURRENDERED, COMPLETED, FULLY PAID UP, REDUCED PAID-UP)
 * and policies already marked as LAPSED.
 *
 * Verifies that no paid payment record covers the due date before marking as lapsed.
 *
 * @returns Number of policies transitioned to LAPSED
 */
export const checkAndAutoLapsePolicies = async (): Promise<number> => {
  const lapsedStatus = await prisma.policyStatusMaster.findFirst({
    where: { statusCode: { equals: "LAPSED", mode: "insensitive" } },
  });

  if (!lapsedStatus) {
    console.warn("⚠️ [LAPSE CHECK] Policy status 'LAPSED' not found in database.");
    return 0;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const cutoffDate = new Date(today);
  cutoffDate.setDate(cutoffDate.getDate() - LAPSED_THRESHOLD_DAYS);
  cutoffDate.setHours(23, 59, 59, 999);

  // Find all candidate policies:
  // 1. Not already LAPSED or excluded
  // 2. nextPremiumDueDate is on or before cutoffDate (60+ days ago)
  const candidatePolicies = await prisma.policy.findMany({
    where: {
      nextPremiumDueDate: {
        lte: cutoffDate,
      },
      status: {
        statusCode: {
          notIn: [...LAPSED_EXCLUDED_POLICY_STATUS_CODES, "LAPSED"],
        },
      },
    },
    select: {
      id: true,
      policyNumber: true,
      nextPremiumDueDate: true,
      statusId: true,
      premiumPayments: {
        where: {
          OR: [
            { paidDate: { not: null } },
            { paymentStatus: { statusCode: "PAID" } },
          ],
        },
        select: {
          dueDate: true,
          installmentNo: true,
        },
      },
    },
  });

  let lapsedCount = 0;

  for (const policy of candidatePolicies) {
    if (!policy.nextPremiumDueDate) continue;

    const dueDateStart = new Date(policy.nextPremiumDueDate);
    dueDateStart.setHours(0, 0, 0, 0);
    const dueDateEnd = new Date(policy.nextPremiumDueDate);
    dueDateEnd.setHours(23, 59, 59, 999);

    // Verify if there is a paid record matching this due date
    const hasPaid = policy.premiumPayments.some((p) => {
      const pDueDate = new Date(p.dueDate);
      return pDueDate >= dueDateStart && pDueDate <= dueDateEnd;
    });

    if (hasPaid) {
      continue; // Payment exists, do not lapse
    }

    const daysOverdue = Math.floor(
      (today.getTime() - dueDateStart.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Update status to LAPSED
    await prisma.policy.update({
      where: { id: policy.id },
      data: { statusId: lapsedStatus.id },
    });

    // Create Notification
    await prisma.notification.create({
      data: {
        title: "Policy Lapsed",
        message: `Policy (${policy.policyNumber}) has been automatically marked as Lapsed due to non-payment of premium due on ${policy.nextPremiumDueDate.toISOString().slice(0, 10)} (${daysOverdue} days overdue).`,
        type: NotificationType.POLICY_LAPSED,
        policyId: policy.id,
      },
    });

    console.log(
      `🔒 [AUTO-LAPSE] Policy ${policy.policyNumber} transitioned to LAPSED (${daysOverdue} days overdue).`
    );
    lapsedCount++;
  }

  if (lapsedCount > 0) {
    console.log(`✅ [AUTO-LAPSE] Transitioned ${lapsedCount} policy(ies) to LAPSED status.`);
  }

  return lapsedCount;
};
