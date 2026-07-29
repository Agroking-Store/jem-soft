import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface ClaimData {
  policyId: string;
  claimantName?: string;
  claimType: string;
  claimAmount: number;
  claimDate: string;
  status?: string;
  reasonForClaim?: string;
  nomineeId?: string;
}

export const getAllClaims = async () => {
  return await prisma.claim.findMany({
    include: {
      policy: {
        select: {
          policyNumber: true,
          CustomerMaster: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      },
      nominee: {
        select: {
          id: true,
          nomineeName: true,
          relationship: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

export const getClaimById = async (id: string): Promise<any> => {
  return prisma.claim.findUnique({
    where: {
      id,
    },
    include: {
      policy: {
        include: {
          product: true,
          CustomerMaster: true,
          status: true,
          premium: true,
          nominees: true,
        },
      },
      nominee: true,
    },
  });
};

export const createClaim = async (data: ClaimData, userId: string) => {
  // Validate that nomineeId belongs to the selected policy if provided
  if (data.nomineeId) {
    const nominee = await prisma.nominee.findUnique({
      where: { id: data.nomineeId },
      select: { policyId: true },
    });
    if (!nominee || nominee.policyId !== data.policyId) {
      throw new Error(
        "Selected nominee does not belong to the selected policy.",
      );
    }
  }

  return await prisma.claim.create({
    data: {
      policyId: data.policyId,
      claimantName: data.claimantName,
      claimType: data.claimType,
      claimAmount: data.claimAmount,
      claimDate: new Date(data.claimDate),
      status: data.status || "Pending",
      reasonForClaim: data.reasonForClaim,
      nomineeId: data.nomineeId || null,
      createdById: userId,
    },
    include: {
      policy: {
        include: {
          product: true,
          CustomerMaster: true,
          status: true,
          premium: true,
          nominees: true,
        },
      },
      nominee: true,
    },
  });
};

export const updateClaimById = async (
  id: string,
  data: Partial<ClaimData>,
  userId: string,
) => {
  // Validate that nomineeId belongs to the selected policy if provided
  if (data.nomineeId) {
    const policyId =
      data.policyId ||
      (
        await prisma.claim.findUnique({
          where: { id },
          select: { policyId: true },
        })
      )?.policyId;
    if (policyId) {
      const nominee = await prisma.nominee.findUnique({
        where: { id: data.nomineeId },
        select: { policyId: true },
      });
      if (!nominee || nominee.policyId !== policyId) {
        throw new Error(
          "Selected nominee does not belong to the selected policy.",
        );
      }
    }
  }

  return await prisma.claim.update({
    where: { id },
    data: {
      ...data,
      claimDate: data.claimDate ? new Date(data.claimDate) : undefined,
      nomineeId:
        data.nomineeId !== undefined ? data.nomineeId || null : undefined,
      updatedById: userId,
    },
    include: {
      policy: {
        include: {
          product: true,
          CustomerMaster: true,
          status: true,
          premium: true,
          nominees: true,
        },
      },
      nominee: true,
    },
  });
};

export const deleteClaimById = async (id: string) => {
  return await prisma.claim.delete({ where: { id } });
};
