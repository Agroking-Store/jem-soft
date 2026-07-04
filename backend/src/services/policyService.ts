import { prisma } from "../config/database.js";
import { Policy } from "@prisma/client";

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

  policyTerm?: number;
  premiumPayingTerm?: number;

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
  const {
    riders,
    sumAssured,
    basicYearlyPremium,
    totalRiderPremium,
    installmentPremium,
    totalInstallmentPremium,
    gst,
    // Destructure only what's needed for this specific scope
  } = data;

  // These should ideally come from the DB based on a default or user input
  const status = await prisma.policyStatusMaster.findFirst({
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

        statusId: status.id,
        premiumModeId: premiumMode.id,

        commencementDate: new Date(data.commencementDate),
        maturityDate: data.completionDate
          ? new Date(data.completionDate)
          : undefined,

        policyTerm: data.policyTerm,
        premiumPayingTerm: data.premiumPayingTerm,
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

export const getPolicyById = async (id: string): Promise<any | null> => {
  return prisma.policy.findUnique({
    where: { id },
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
      advisor: true,
      premium: true,
      nominees: true,
      policyRiders: {
        include: {
          rider: true,
        },
      },
      premiumPayments: {
        include: {
          paymentStatus: true,
        },
      },
      documents: true,
      policyAttributes: {
        include: {
          attribute: true,
        },
      },
      loans: {
        include: {
          loanStatus: true,
        },
      },
    },
  });
};
