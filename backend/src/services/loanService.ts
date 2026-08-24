import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface LoanData {
  policyId: string;
  loanAmount: number;
  interestRate: number;
  loanDate: string;
  loanStatusId: string;
  remarks?: string;
}

const loanInclude = {
  policy: {
    select: {
      policyNumber: true,
      commencementDate: true,
      CustomerMaster: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
      premium: {
        select: {
          sumAssured: true,
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

function computeSummary(loan: any) {
  const repayments = loan.repayments || [];
  const totalPrincipalRepaid = repayments.reduce(
    (sum: number, r: any) => sum + Number(r.principalComponent),
    0,
  );
  const totalInterestPaid = repayments.reduce(
    (sum: number, r: any) => sum + Number(r.interestComponent),
    0,
  );
  const totalRepaid = repayments.reduce(
    (sum: number, r: any) => sum + Number(r.repaymentAmount),
    0,
  );
  const outstandingPrincipal = Math.max(
    0,
    Number(loan.loanAmount) - totalPrincipalRepaid,
  );

  const lastPaymentDate =
    repayments.length > 0
      ? new Date(repayments[0].repaymentDate)
      : new Date(loan.loanDate);

  const now = new Date();
  const daysSince = Math.max(
    0,
    Math.floor(
      (now.getTime() - lastPaymentDate.getTime()) / (1000 * 60 * 60 * 24),
    ),
  );
  const accruedInterest =
    loan.loanStatus?.statusCode === "ACTIVE"
      ? Math.round(
          ((outstandingPrincipal * Number(loan.interestRate) * daysSince) /
            36500) *
            100,
        ) / 100
      : 0;

  return {
    totalRepaid: Math.round(totalRepaid * 100) / 100,
    totalPrincipalRepaid: Math.round(totalPrincipalRepaid * 100) / 100,
    totalInterestPaid: Math.round(totalInterestPaid * 100) / 100,
    outstandingPrincipal: Math.round(outstandingPrincipal * 100) / 100,
    accruedInterest,
    totalDue: Math.round((outstandingPrincipal + accruedInterest) * 100) / 100,
  };
}

export const getAllLoans = async () => {
  const loans = await prisma.policyLoan.findMany({
    include: {
      ...loanInclude,
      repayments: {
        select: {
          principalComponent: true,
          interestComponent: true,
          repaymentAmount: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return loans.map((loan) => {
    const summary = computeSummary(loan);
    const { repayments, ...rest } = loan;
    return { ...rest, summary };
  });
};

export const getLoanById = async (id: string) => {
  const loan = await prisma.policyLoan.findUnique({
    where: { id },
    include: {
      ...loanInclude,
      repayments: {
        orderBy: { repaymentDate: "desc" },
      },
    },
  });

  if (!loan) return null;

  const summary = computeSummary(loan);
  return { ...loan, summary };
};

export const createLoan = async (data: LoanData) => {
  const activeStatus = await prisma.loanStatusMaster.findUnique({
    where: { statusCode: "ACTIVE" },
  });

  if (activeStatus) {
    const existingActive = await prisma.policyLoan.findFirst({
      where: {
        policyId: data.policyId,
        loanStatusId: activeStatus.id,
      },
    });

    if (existingActive) {
      throw new Error(
        "This policy already has an active loan. Only one active loan per policy is allowed.",
      );
    }
  }

  return await prisma.policyLoan.create({
    data: {
      policyId: data.policyId,
      loanAmount: data.loanAmount,
      interestRate: data.interestRate,
      loanDate: new Date(data.loanDate),
      loanStatusId: data.loanStatusId,
      remarks: data.remarks,
    },
    include: {
      ...loanInclude,
      repayments: { orderBy: { repaymentDate: "desc" } },
    },
  });
};

export const updateLoanById = async (id: string, data: Partial<LoanData>) => {
  return await prisma.policyLoan.update({
    where: { id },
    data: {
      loanAmount: data.loanAmount,
      interestRate: data.interestRate,
      loanDate: data.loanDate ? new Date(data.loanDate) : undefined,
      loanStatusId: data.loanStatusId,
      remarks: data.remarks,
    },
    include: {
      ...loanInclude,
      repayments: { orderBy: { repaymentDate: "desc" } },
    },
  });
};

export const deleteLoanById = async (id: string) => {
  const loan = await prisma.policyLoan.findUnique({
    where: { id },
    include: { repayments: true },
  });

  if (!loan) throw new Error("Loan not found");

  if (loan.repayments.length > 0) {
    throw new Error(
      "Cannot delete a loan that has repayments. Close the loan instead.",
    );
  }

  return await prisma.policyLoan.delete({ where: { id } });
};
