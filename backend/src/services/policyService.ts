import { prisma } from "../config/database.js";
import { Policy } from "@prisma/client";
import { AppError } from "../utils/AppError.js";
import { createNotification } from "./notificationService.js";
import { NotificationType } from "@prisma/client";

interface RiderData {
  description: string;
  sum: number | null;
  term: number | null;
  ppt: number | null;
  premium: number | null;
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

  providerId: string;
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
    sumAssured,
    basicYearlyPremium,
    totalRiderPremium,
    installmentPremium,
    totalInstallmentPremium,
    gst,
    statusId,
    // Destructure only what's needed for this specific scope
    term,
    ppt,
    sumAssured: formSumAssured, // Rename to avoid conflict with `sumAssured` from premium
    fupDate,
  } = data;

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

  return prisma.$transaction(async (tx) => {
    const newPolicy = await tx.policy.create({
      data: {
        clientId: data.groupId,
        CustomerMasterId: data.lifeAssuredId,

        providerId: data.providerId,
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
        policyTerm: term,
        premiumPayingTerm: ppt,
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

    await tx.policyPremiumCalculation.create({
      data: {
        policyId: newPolicy.id,

        sumAssured: sumAssured ?? 0,
        basicYearlyPremium: basicYearlyPremium ?? 0,
        totalYearlyPremium:
          (basicYearlyPremium ?? 0) + (totalRiderPremium ?? 0),

        installmentPremium: installmentPremium ?? 0,
        totalInstallmentPremium: totalInstallmentPremium ?? 0,

        gst: gst ?? 0,
      },
    });

    // Save Policy Attributes using values entered in the form
    console.log("Received attributes:", data.attributes);
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
      CustomerMaster: true,
      customer: true,
      provider: true,
      product: true,
      status: true,
      premiumMode: true,
      premium: true,
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
    sumAssured,
    basicYearlyPremium,
    totalRiderPremium,
    installmentPremium,
    totalInstallmentPremium,
    gst,
    attributes,
  } = data;

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

  return prisma.$transaction(async (tx) => {
    const updatedPolicy = await tx.policy.update({
      where: {
        id,
      },
      data: {
        clientId: data.groupId,
        CustomerMasterId: data.lifeAssuredId,

        providerId: data.providerId,
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

        premiumPayingTerm: data.ppt,

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

    await tx.policyPremiumCalculation.update({
      where: {
        policyId: id,
      },

      data: {
        sumAssured: sumAssured ?? 0,

        basicYearlyPremium: basicYearlyPremium ?? 0,

        totalYearlyPremium:
          (basicYearlyPremium ?? 0) + (totalRiderPremium ?? 0),

        installmentPremium: installmentPremium ?? 0,

        totalInstallmentPremium: totalInstallmentPremium ?? 0,

        gst: gst ?? 0,
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
