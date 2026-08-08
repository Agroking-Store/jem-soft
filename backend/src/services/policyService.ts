import { prisma } from "../config/database.js";
import { Policy } from "@prisma/client";
import { AppError } from "../utils/AppError.js";
import { createNotification } from "./notificationService.js";
import { NotificationType } from "@prisma/client";
import { calculatePremium } from "./premiumCalculationService.js";

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
}

export const createPolicy = async (data: PolicyData): Promise<Policy> => {
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

  const age = data.age !== undefined && data.age !== null ? Number(data.age) : undefined;
  const sumAssured = data.sumAssured !== undefined && data.sumAssured !== null ? Number(data.sumAssured) : undefined;
  const policyTerm = term !== undefined && term !== null ? Number(term) : undefined;
  const premiumPayingTerm = ppt !== undefined && ppt !== null ? Number(ppt) : null;

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

        statusId: status.id,
        premiumModeId: premiumMode.id,

        commencementDate: new Date(data.commencementDate),
        maturityDate: data.completionDate
          ? new Date(data.completionDate)
          : undefined,

        nextPremiumDueDate: fupDate ? new Date(fupDate) : undefined,
        policyTerm: policyTerm,
        premiumPayingTerm: premiumPayingTerm,
      },
    });

    if (riders && riders.length > 0) {
      for (const riderData of riders) {
        const riderMaster = await tx.riderMaster.findFirst({
          where: { riderName: riderData.description },
        });
        if (riderMaster) {
          await tx.policyRider.create({
            data: {
              policyId: newPolicy.id,
              riderId: riderMaster.id,
              riderAmount: riderData.sum,
              riderPremium: riderData.premium,
            },
          });
        }
      }
    }

    const premium = await calculatePremium({
      productId: data.productId,
      age: age!,
      policyTerm: policyTerm!,
      premiumPayingTerm: premiumPayingTerm,
      sumAssured: sumAssured!, // Ensure sumAssured is not null
      premiumMode: data.mode,
    });

    await tx.policyPremiumCalculation.create({
      data: {
        policyId: newPolicy.id,
        sumAssured: sumAssured ?? 0,

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

    await createNotification(tx, {
      title: "Policy Created",
      message: `New policy (${newPolicy.policyNumber}) has been created.`,
      type: NotificationType.POLICY_CREATED,
      policyId: newPolicy.id,
    });

    return newPolicy;
  });
};

export const getAllPolicies = async (): Promise<any[]> => {
  return prisma.policy.findMany({
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
  const ppts = [
    ...new Set(rates.map((r) => r.premiumPayingTerm)),
  ].sort((a, b) => (a === null ? -1 : b === null ? 1 : a - b));

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
      customer: true,
      provider: true,
      product: true,
      status: true,
      premiumMode: true,
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
  const {
    riders,
    totalRiderPremium,
    attributes,
  } = data;

  const age = data.age !== undefined && data.age !== null ? Number(data.age) : undefined;
  const sumAssured = data.sumAssured !== undefined && data.sumAssured !== null ? Number(data.sumAssured) : undefined;
  const policyTerm = data.term !== undefined && data.term !== null ? Number(data.term) : undefined;
  const premiumPayingTerm = data.ppt !== undefined && data.ppt !== null ? Number(data.ppt) : null;

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

        premiumModeId: premiumMode.id,

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
            riderName: riderData.description,
          },
        });

        if (riderMaster) {
          await tx.policyRider.create({
            data: {
              policyId: id,
              riderId: riderMaster.id,
              riderAmount: riderData.sum,
              riderPremium: riderData.premium,
            },
          });
        }
      }
    }

    // Update Premium Calculation


    const premium = await calculatePremium({
  productId: data.productId,
  age: data.age,
  policyTerm: data.term!,
  premiumPayingTerm: data.ppt,
  sumAssured: data.sumAssured!, // Ensure sumAssured is not null
  premiumMode: data.mode, // Pass the premium mode
    });
    await tx.policyPremiumCalculation.update({
      where: {
        policyId: id,
      },

      data: {
        sumAssured: data.sumAssured ?? 0,

        basicYearlyPremium: premium.basicYearlyPremium, // From service

        totalYearlyPremium:
          premium.basicYearlyPremium + (totalRiderPremium ?? 0),

        installmentPremium: premium.installmentPremium, // From service

        totalInstallmentPremium:
          premium.installmentPremium + (totalRiderPremium ?? 0),

        gst: premium.gst, // From service
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

    await createNotification(tx, {
      title: "Policy Updated",
      message: `Policy (${updatedPolicy.policyNumber}) has been updated.`,
      type: NotificationType.POLICY_UPDATED,
      policyId: updatedPolicy.id,
    });

    return updatedPolicy;
  });
};
