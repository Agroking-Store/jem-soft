import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface LoanData {
    policyId: string;
    loanNumber?: string;
    loanAmount: number;
    interestRate?: number;
    loanDate: string;
    loanStatusId: string;

    loanTenure?: number;
    remarks?: string;
}

const loanInclude = {
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
    loanStatus: {
        select: {
            statusName: true,
            statusCode: true,
        },
    },
};

export const getAllLoans = async () => {
    return await prisma.policyLoan.findMany({
        include: loanInclude,
        orderBy: {
            createdAt: 'desc',
        },
    });
};

export const getLoanById = async (id: string) => {
    return await prisma.policyLoan.findUnique({
        where: { id },
        include: loanInclude,
    });
};

export const createLoan = async (data: LoanData) => {
   return await prisma.policyLoan.create({
    data: {
        policyId: data.policyId,
        loanNumber: data.loanNumber,
        loanAmount: data.loanAmount,
        interestRate: data.interestRate,
        loanDate: new Date(data.loanDate),
        loanStatusId: data.loanStatusId,

        loanTenure: data.loanTenure,
        remarks: data.remarks,
    },
    include: loanInclude,
});
};

export const updateLoanById = async (id: string, data: Partial<LoanData>) => {
    return await prisma.policyLoan.update({
        where: { id },
       data: {
    ...data,
    loanDate: data.loanDate
        ? new Date(data.loanDate)
        : undefined,

    loanTenure: data.loanTenure,
    remarks: data.remarks,
},
        include: loanInclude,
    });
};

export const deleteLoanById = async (id: string) => {
    return await prisma.policyLoan.delete({ where: { id } });
};