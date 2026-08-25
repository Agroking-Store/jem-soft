import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface RepaymentData {
  repaymentDate: string;
  repaymentAmount: number;
  paymentMode: string;
  referenceNumber?: string;
  remarks?: string;
}

/**
 * Calculate simple interest: P × R × Days / 36500
 */
function calculateAccruedInterest(
  outstandingPrincipal: number,
  annualRate: number,
  fromDate: Date,
  toDate: Date,
): number {
  const days = Math.max(
    0,
    Math.floor((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)),
  );
  if (days === 0 || outstandingPrincipal <= 0) return 0;
  const interest = (outstandingPrincipal * annualRate * days) / 36500;
  return Math.round(interest * 100) / 100;
}

export const getRepaymentsByLoanId = async (loanId: string) => {
  return await prisma.loanRepayment.findMany({
    where: { loanId },
    orderBy: { repaymentDate: "desc" },
  });
};

export const createRepayment = async (loanId: string, data: RepaymentData) => {
  const loan = await prisma.policyLoan.findUnique({
    where: { id: loanId },
    include: {
      repayments: { orderBy: { repaymentDate: "desc" } },
      loanStatus: true,
    },
  });

  if (!loan) throw new Error("Loan not found");
  if (loan.loanStatus.statusCode !== "ACTIVE") {
    throw new Error(
      `Cannot record repayment. Loan status is "${loan.loanStatus.statusName}".`,
    );
  }

  const totalPrincipalRepaid = loan.repayments.reduce(
    (sum, r) => sum + Number(r.principalComponent),
    0,
  );
  const outstandingPrincipal = Math.max(
    0,
    Number(loan.loanAmount) - totalPrincipalRepaid,
  );

  if (outstandingPrincipal <= 0.01) {
    throw new Error("This loan is already fully repaid.");
  }

  const lastPaymentDate =
    loan.repayments.length > 0
      ? new Date(loan.repayments[0].repaymentDate)
      : new Date(loan.loanDate);

  const repaymentDate = new Date(data.repaymentDate);
  const accruedInterest = calculateAccruedInterest(
    outstandingPrincipal,
    Number(loan.interestRate),
    lastPaymentDate,
    repaymentDate,
  );

  const totalDue = outstandingPrincipal + accruedInterest;
  const repaymentAmount = Number(data.repaymentAmount);

  if (repaymentAmount <= 0) {
    throw new Error("Repayment amount must be greater than zero.");
  }

  if (repaymentAmount > totalDue + 0.5) {
    throw new Error(
      `Repayment amount (₹${repaymentAmount}) exceeds total due (₹${totalDue.toFixed(2)}).`,
    );
  }

  const interestComponent = Math.min(repaymentAmount, accruedInterest);
  const principalComponent =
    Math.round((repaymentAmount - interestComponent) * 100) / 100;

  const repayment = await prisma.loanRepayment.create({
    data: {
      loanId,
      repaymentDate,
      repaymentAmount,
      principalComponent,
      interestComponent: Math.round(interestComponent * 100) / 100,
      paymentMode: data.paymentMode,
      referenceNumber: data.referenceNumber || null,
      remarks: data.remarks || null,
    },
  });

  const newOutstanding = outstandingPrincipal - principalComponent;
  if (newOutstanding <= 0.5) {
    const paidOffStatus = await prisma.loanStatusMaster.findUnique({
      where: { statusCode: "PAID_OFF" },
    });
    if (paidOffStatus) {
      await prisma.policyLoan.update({
        where: { id: loanId },
        data: { loanStatusId: paidOffStatus.id },
      });
    }
  }

  return repayment;
};
