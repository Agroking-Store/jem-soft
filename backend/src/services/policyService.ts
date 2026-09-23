import { prisma } from "../config/database.js";
import { Policy } from "@prisma/client";
import { AppError } from "../utils/AppError.js";
import { createNotification } from "./notificationService.js";
import { NotificationType } from "@prisma/client";
import { calculatePremium } from "./premiumCalculationService.js";
import { addMonths } from "date-fns";

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
  console.log("========== CREATE POLICY ==========");
  console.log("Product ID:", data.productId);
  console.log("Age:", data.age);
  console.log("Secondary Age:", data.spouseAge);
  console.log("Option:", data.option);
  console.log("Term:", data.term);
  console.log("PPT:", data.ppt);
  console.log("Sum Assured:", data.sumAssured);
  console.log("Mode:", data.mode);
  console.log("===================================");
  // Validate policy number format
  if (!/^\d{9}$/.test(data.policyNumber)) {
    throw new AppError("Policy number must be exactly 9 digits.", 400);
  }

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
      "Age, sum assured, and policy term are required to calculate premium.",
      400,
    );
  }

  // Use the provided statusId, or fall back to 'ACTIVE' if not provided
  const status = statusId
    ? await prisma.policyStatusMaster.findUnique({ where: { id: statusId } })
    : await prisma.policyStatusMaster.findFirst({
      where: { statusCode: { equals: "ACTIVE", mode: "insensitive" } },
    });

  const premiumMode = await prisma.premiumModeMaster.findFirst({
    where: { modeName: { equals: data.mode, mode: "insensitive" } },
  });

  //Paid Status By default
  const paymentStatus = await prisma.paymentStatusMaster.findFirst({
    where: { statusCode: { equals: "PAID" } },
  });

  const paymentMethodCode = data.paymentMethod || "CHQ";
  const paymentMode = await prisma.paymentModeMaster.findFirst({
    where: { modeCode: { equals: paymentMethodCode } },
  }) || await prisma.paymentModeMaster.findFirst({
    where: { modeCode: { equals: "CHQ" } },
  });

  //Get next premium due date
  const monthsToAdd = premiumMode?.months;
  const dueDate = new Date(data.commencementDate);
  const nextPremiumDueDate = fupDate ? new Date(fupDate) : addMonths(dueDate, monthsToAdd!);

  if (!status || !premiumMode) {
    throw new Error("Default policy status or premium mode not found.");
  }

  const product = await prisma.productMaster.findUnique({
    where: { id: data.productId },
    select: {
      providerId: true,
    },
  });

  if (!product) {
    throw new AppError("Product not found.", 404);
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

        statusId: status.id,
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
        const riderMaster = await tx.riderMaster.findFirst({
          where: {
            OR: [
              { riderName: riderData.description },
              { riderCode: riderData.description },
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
      },
    });

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

    await createNotification(tx, {
      title: "Policy Created",
      message: `New policy (${newPolicy.policyNumber}) has been created.`,
      type: NotificationType.POLICY_CREATED,
      policyId: newPolicy.id,
    });

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
}

export const getAllPolicies = async (
  filters: PolicySearchFilters = {},
): Promise<any[]> => {
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
    orderBy: { commencementDate: "desc" },
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

  const premiumMode = await prisma.premiumModeMaster.findFirst({
    where: {
      modeName: {
        equals: data.mode,
        mode: "insensitive",
      },
    },
  });

  if (!premiumMode) {
    throw new Error("Premium mode not found.");
  }

  const product = await prisma.productMaster.findUnique({
    where: { id: data.productId },
    select: {
      providerId: true,
    },
  });

  if (!product) {
    throw new AppError("Product not found.", 404);
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
        paymentModeId: (
          await tx.paymentModeMaster.findFirst({
            where: { modeCode: { equals: data.paymentMethod || "CHQ" } },
          }) || await tx.paymentModeMaster.findFirst({
            where: { modeCode: { equals: "CHQ" } },
          })
        )!.id,

        commencementDate: new Date(data.commencementDate),

        maturityDate: data.completionDate
          ? new Date(data.completionDate)
          : null,

        policyTerm: data.term,

        premiumPayingTerm: premiumPayingTerm,

        statusId: data.statusId,

        nextPremiumDueDate: data.fupDate ? new Date(data.fupDate) : null,
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
        const riderMaster = await tx.riderMaster.findFirst({
          where: {
            OR: [
              { riderName: riderData.description },
              { riderCode: riderData.description },
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
      },
    });

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

    await createNotification(tx, {
      title: "Policy Updated",
      message: `Policy (${updatedPolicy.policyNumber}) has been updated.`,
      type: NotificationType.POLICY_UPDATED,
      policyId: updatedPolicy.id,
    });

    return updatedPolicy;
  });
};
