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
      id: true,
      policyNumber: true,
      commencementDate: true,
      nextPremiumDueDate: true,
      agentCode: true,
      CustomerMaster: {
        select: {
          id: true,
          firstName: true,
          middleName: true,
          lastName: true,
          salutation: true,
          dob: true,
          contactInfo: {
            select: {
              mobile1: true,
              emailPersonal: true,
            },
          },
          addresses: {
            select: {
              addressType: true,
              addressLine1: true,
              addressLine2: true,
              city: true,
              pin: true,
            },
          },
        },
      },
      customer: {
        select: {
          id: true,
          name: true,
          groupCode: true,
          groupName: true,
          phone: true,
          resArea: true,
          resCity: true,
        },
      },
      product: {
        select: {
          id: true,
          productName: true,
          planNumber: true,
        },
      },
      advisor: {
        select: {
          id: true,
          advisorName: true,
          advisorCode: true,
        },
      },
      branch: {
        select: {
          id: true,
          branchName: true,
          branchCode: true,
        },
      },
      status: {
        select: {
          id: true,
          statusName: true,
          statusCode: true,
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
      id: true,
      statusName: true,
      statusCode: true,
    },
  },
};

function computeSummary(loan: any) {
  const repayments = loan.repayments || [];
  const totalPrincipalRepaid = repayments.reduce(
    (sum: number, r: any) => sum + Number(r.principalComponent || 0),
    0,
  );
  const totalInterestPaid = repayments.reduce(
    (sum: number, r: any) => sum + Number(r.interestComponent || 0),
    0,
  );
  const totalRepaid = repayments.reduce(
    (sum: number, r: any) => sum + Number(r.repaymentAmount || 0),
    0,
  );
  const outstandingPrincipal = Math.max(
    0,
    Number(loan.loanAmount || 0) - totalPrincipalRepaid,
  );

  const lastPaymentDate =
    repayments.length > 0 && repayments[0]?.repaymentDate
      ? new Date(repayments[0].repaymentDate)
      : new Date(loan.loanDate);

  const now = new Date();
  const validLastDate = isNaN(lastPaymentDate.getTime()) ? new Date(loan.loanDate) : lastPaymentDate;
  const daysSince = isNaN(validLastDate.getTime())
    ? 0
    : Math.max(
        0,
        Math.floor((now.getTime() - validLastDate.getTime()) / (1000 * 60 * 60 * 24)),
      );

  const annualRate = Number(loan.interestRate || 0);
  const accruedInterest =
    loan.loanStatus?.statusCode === "ACTIVE" && outstandingPrincipal > 0
      ? Math.round(((outstandingPrincipal * annualRate * daysSince) / 36500) * 100) / 100
      : 0;

  return {
    totalRepaid: Math.round(totalRepaid * 100) / 100,
    totalPrincipalRepaid: Math.round(totalPrincipalRepaid * 100) / 100,
    totalInterestPaid: Math.round(totalInterestPaid * 100) / 100,
    outstandingPrincipal: Math.round(outstandingPrincipal * 100) / 100,
    accruedInterest,
    totalDue: Math.round((outstandingPrincipal + accruedInterest) * 100) / 100,
    daysSinceLastPayment: daysSince,
    lastPaymentDate: validLastDate.toISOString(),
  };
}

export const getAllLoans = async () => {
  const loans = await prisma.policyLoan.findMany({
    include: {
      ...loanInclude,
      repayments: {
        select: {
          id: true,
          loanId: true,
          repaymentDate: true,
          repaymentAmount: true,
          principalComponent: true,
          interestComponent: true,
          paymentMode: true,
          referenceNumber: true,
          remarks: true,
          createdAt: true,
        },
        orderBy: { repaymentDate: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return loans.map((loan) => {
    const summary = computeSummary(loan);
    return { ...loan, summary };
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

  const newLoan = await prisma.policyLoan.create({
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

  const summary = computeSummary(newLoan);
  return { ...newLoan, summary };
};

export const updateLoanById = async (id: string, data: Partial<LoanData>) => {
  const updatedLoan = await prisma.policyLoan.update({
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

  const summary = computeSummary(updatedLoan);
  return { ...updatedLoan, summary };
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
