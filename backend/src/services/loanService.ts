import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface LoanData {
    policyId: string;
    loanAmount: number;
    interestRate?: number;
    loanDate: string;
    loanStatusId: string;
    remarks?: string;

    // New fields from LoanForm
  prevLoanTaken?: number;
  repaymentDate?: string;
  repayAmount?: number;
  totalLoanAmount?: number;
  totalLoanRepaidAmount? : number;
  totalLoanInterestPaid? : number;
  repaymentRemarks?: string;
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
        loanAmount: data.loanAmount,
        interestRate: data.interestRate,
        loanDate: new Date(data.loanDate),
        loanStatusId: data.loanStatusId,
        remarks: data.remarks,
      repaymentDate: data.repaymentDate,
      repayAmount : data.repayAmount,
      totalLoanRepaidAmount: data.totalLoanRepaidAmount,
      totalLoanInterestPaid: data.totalLoanInterestPaid,

      repaymentRemarks: data.repaymentRemarks,
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
    repaymentDate : data.repaymentDate 
    ? new Date(data.repaymentDate) : undefined,
    remarks: data.remarks,
},
        include: loanInclude,
    });
};

export const deleteLoanById = async (id: string) => {
    return await prisma.policyLoan.delete({ where: { id } });
};