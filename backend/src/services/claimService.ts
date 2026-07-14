import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface ClaimData {
    policyId: string;
    claimantName: string;
    claimType: string;
    claimAmount: number;
    claimDate: string;
    status?: string;
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
                        }
                    }
                }
            }
        },
        orderBy: {
            createdAt: 'desc'
        }
    });
};

export const getClaimById = async (id: string): Promise<any> => {
  return prisma.claim.findUnique({
    where: {
      id,
    },
    include: {
        policy : {
            include : {
                product : true
            }
        }
    },
  });
};

export const createClaim = async (data: ClaimData, userId: string) => {
    return await prisma.claim.create({
        data: {
            ...data,
            claimDate: new Date(data.claimDate),
            createdById: userId,
        }
    });
};

export const updateClaimById = async (id: string, data: Partial<ClaimData>, userId: string) => {
    return await prisma.claim.update({
        where: { id },
        data: {
            ...data,
            claimDate: data.claimDate ? new Date(data.claimDate) : undefined,
            updatedById: userId,
        }
    });
};

export const deleteClaimById = async (id: string) => {
    return await prisma.claim.delete({ where: { id } });
};