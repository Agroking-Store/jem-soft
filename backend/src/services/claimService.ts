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
  nomineeId?: string | null;
  // Payment fields
  paymentType?: string;
  chequeNumber?: string | null;
  chequeDate?: string | null;
  bankName?: string | null;
  branchName?: string | null;
  chequeAmount?: number | null;
  accountHolderName?: string | null;
  accountNumber?: string | null;
  ifscCode?: string | null;
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
      // Payment fields
      paymentType: data.paymentType || null,
      chequeNumber: data.chequeNumber || null,
      chequeDate: data.chequeDate ? new Date(data.chequeDate) : null,
      bankName: data.bankName || null,
      branchName: data.branchName || null,
      chequeAmount: data.chequeAmount || null,
      accountHolderName: data.accountHolderName || null,
      accountNumber: data.accountNumber || null,
      ifscCode: data.ifscCode || null,
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
      // Payment fields
      paymentType:
        data.paymentType !== undefined ? data.paymentType || null : undefined,
      chequeNumber:
        data.chequeNumber !== undefined ? data.chequeNumber || null : undefined,
      chequeDate:
        data.chequeDate !== undefined
          ? data.chequeDate
            ? new Date(data.chequeDate)
            : null
          : undefined,
      bankName: data.bankName !== undefined ? data.bankName || null : undefined,
      branchName:
        data.branchName !== undefined ? data.branchName || null : undefined,
      chequeAmount:
        data.chequeAmount !== undefined ? data.chequeAmount || null : undefined,
      accountHolderName:
        data.accountHolderName !== undefined
          ? data.accountHolderName || null
          : undefined,
      accountNumber:
        data.accountNumber !== undefined
          ? data.accountNumber || null
          : undefined,
      ifscCode: data.ifscCode !== undefined ? data.ifscCode || null : undefined,
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

const toNumber = (value: any) => {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (typeof value === "object" && typeof value.toNumber === "function") {
    return value.toNumber();
  }
  return 0;
};

const findAttributeValue = (
  policyAttributes: any[] | undefined,
  attributeCodes: string[],
  attributeNames: string[],
) => {
  if (!policyAttributes) return 0;

  const attr = policyAttributes.find((policyAttribute) => {
    const code = policyAttribute.attribute?.attributeCode;
    const name = policyAttribute.attribute?.attributeName;
    return attributeCodes.includes(code) || attributeNames.includes(name);
  });

  if (!attr) return 0;
  return toNumber(attr.value);
};

export const calculateClaimAmount = async (
  policyId: string,
  claimType: string,
) => {
  if (!policyId) {
    throw new Error("Policy ID is required.");
  }

  const policy = await prisma.policy.findUnique({
    where: { id: policyId },
    include: {
      premium: true,
      loans: true,
      policyAttributes: {
        include: {
          attribute: true,
        },
      },
    },
  });

  if (!policy) {
    throw new Error("Policy not found.");
  }

  const sumAssured = toNumber(policy.premium?.sumAssured);
  const reversionaryBonus = findAttributeValue(
    policy.policyAttributes,
    ["REVERSIONARY_BONUS"],
    ["Reversionary Bonus"],
  );
  const finalAdditionalBonus = findAttributeValue(
    policy.policyAttributes,
    ["FINAL_ADDITIONAL_BONUS"],
    ["Final Additional Bonus", "F.A.B"],
  );

  const outstandingLoan = policy.loans.reduce((total, loan) => {
    const loanAmount = toNumber(loan.loanAmount);
    const loanRepaidAmount = toNumber(loan.loanRepaidAmount);
    const outstanding = loanAmount - loanRepaidAmount;
    return total + Math.max(0, outstanding);
  }, 0);

  const loanInterest = policy.loans.reduce((total, loan) => {
    const totalLoanAmount = toNumber(loan.totalLoanAmount);
    const loanAmount = toNumber(loan.loanAmount);
    const interestFromTotal = Math.max(0, totalLoanAmount - loanAmount);
    const interestFromDetail =
      toNumber(loan.bpiInterest) + toNumber(loan.hlyInterest);
    return total + (interestFromTotal || interestFromDetail);
  }, 0);

  const calculation = {
    sumAssured,
    reversionaryBonus,
    finalAdditionalBonus,
    outstandingLoan,
    loanInterest,
  };

  const maxClaimAmount =
    claimType === "Death"
      ? Math.max(
          0,
          sumAssured +
            reversionaryBonus +
            finalAdditionalBonus -
            outstandingLoan -
            loanInterest,
        )
      : null;

  return {
    maxClaimAmount,
    calculation,
  };
};
