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

    // New fields from LoanForm
  totalLoanGranted?: number;
  prevLoanTaken?: number;
  prevLoanInterestRate?: number;
  otherDeduction?: number;
  xChargeDeduction?: number;
  revivalDeduction?: number;
  addDeposit?: number;
  netAmount?: number;
  chequeAmount?: number;
  repaymentDate?: string;
  loanRepaidAmount?: number;
  totalLoanAmount?: number;
  bpiInterest?: number;
  hlyInterest?: number;
  fuliDate?: string;
  repaymentRemarks?: string;
}

const toOptionalNumber = (value: unknown): number | undefined => {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const toOptionalDate = (value: unknown): Date | undefined => {
  if (value === null || value === undefined || value === "") return undefined;
  const date = new Date(value as string | number | Date);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

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

        totalLoanGranted: data.totalLoanGranted,
      prevLoanTaken: toOptionalNumber(data.prevLoanTaken),
      prevLoanInterestRate: toOptionalNumber(data.prevLoanInterestRate),
      otherDeduction: toOptionalNumber(data.otherDeduction),
      xChargeDeduction: toOptionalNumber(data.xChargeDeduction),
      revivalDeduction: toOptionalNumber(data.revivalDeduction),
      addDeposit: toOptionalNumber(data.addDeposit),
      netAmount: toOptionalNumber(data.netAmount),
      chequeAmount: toOptionalNumber(data.chequeAmount),
      repaymentDate: toOptionalDate(data.repaymentDate),
      loanRepaidAmount: toOptionalNumber(data.loanRepaidAmount),
      totalLoanAmount: toOptionalNumber(data.totalLoanAmount),
      bpiInterest: toOptionalNumber(data.newBpiInterest),
      hlyInterest: toOptionalNumber(data.newHlyInterest),
      fuliDate: toOptionalDate(data.fuliDate),
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

    loanTenure: data.loanTenure,
    remarks: data.remarks,
},
        include: loanInclude,
    });
};

export const deleteLoanById = async (id: string) => {
    return await prisma.policyLoan.delete({ where: { id } });
};