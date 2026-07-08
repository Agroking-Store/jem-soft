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

  riders?: RiderData[];
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
    // Destructure only what's needed for this specific scope
    term,
    ppt,
    fupDate,
  } = data;

  // These should ideally come from the DB based on a default or user input
  const status = await prisma.policyStatusMaster.findFirst({
    where: { statusCode: { equals: 'ACTIVE', mode: 'insensitive' } },
  });

  const premiumMode = await prisma.premiumModeMaster.findFirst({
    where: { modeName: { equals: data.mode, mode: 'insensitive' } },
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

        statusId: status.id,
        premiumModeId: premiumMode.id,

        commencementDate: new Date(data.commencementDate),
        maturityDate: data.completionDate
          ? new Date(data.completionDate)
          : undefined,

        nextPremiumDueDate: fupDate
          ? new Date(fupDate)
          : undefined,
        policyTerm: term,
        premiumPayingTerm: ppt,
      },
    });



    if (riders && riders.length > 0) {
      for (const riderData of riders) {
        const riderMaster = await tx.riderMaster.findFirst({ where: { riderName: riderData.description } });
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
  // First, check if the policy exists
  const policy = await prisma.policy.findUnique({
    where: { id: policyId },
  });

  if (!policy) {
    throw new Error("Policy not found.");
  }

  // Use a transaction to ensure all related data is deleted along with the policy
  return prisma.$transaction(async (tx) => {
    // Delete related premium calculations
    await tx.policyPremiumCalculation.deleteMany({
      where: { policyId: policyId },
    });

    // Delete related riders
    await tx.policyRider.deleteMany({
      where: { policyId: policyId },
    });

    // Finally, delete the policy itself
    return tx.policy.delete({ where: { id: policyId } });
  });
};
export const getPolicyById = async (id: string): Promise<any> => {
  return prisma.policy.findUnique({
    where: {
      id,
    },
    include: {
      CustomerMaster: true,
      customer: true,
      provider: true,
      product: true,
      status: true,
      premiumMode: true,
      premium: true,
      policyRiders: {
        include: {
          rider: true,
        },
      },
    },
  });
};
export const updatePolicy = async (
  id: string,
  data: PolicyData
): Promise<Policy> => {

  const {
    riders,
    sumAssured,
    basicYearlyPremium,
    totalRiderPremium,
    installmentPremium,
    totalInstallmentPremium,
    gst,
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
          (basicYearlyPremium ?? 0) +
          (totalRiderPremium ?? 0),

        installmentPremium: installmentPremium ?? 0,

        totalInstallmentPremium:
          totalInstallmentPremium ?? 0,

        gst: gst ?? 0,
      },
    });

    await tx.notification.create({
      data: {
        title: "Policy Updated",
        message: `Policy (${updatedPolicy.policyNumber}) has been updated.`,
        type: "POLICY_UPDATED",
        policyId: updatedPolicy.id,
      },
    });

    return updatedPolicy;
  });
};