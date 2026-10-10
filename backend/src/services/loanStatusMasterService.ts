import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getAllLoanStatuses = async () => {
    return await prisma.loanStatusMaster.findMany({
        orderBy: {
            statusName: 'asc',
        },
    });
};