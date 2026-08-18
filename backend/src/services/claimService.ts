import { PrismaClient } from "@prisma/client";
import { AppError } from "../utils/AppError.js";

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

  return await prisma.$transaction(async (tx) => {
    const policy = await tx.policy.findUnique({
      where: { id: data.policyId },
      include: { status: true },
    });

    if (!policy) {
      throw new AppError("Policy not found.", 404);
    }

    const policyStatusCode = String(policy.status?.statusCode ?? "")
      .trim()
      .toUpperCase();
    const policyStatusName = String(policy.status?.statusName ?? "")
      .trim()
      .toUpperCase();

    if (policyStatusCode === "CLAIMED" || policyStatusName === "CLAIMED") {
      throw new AppError(
        "Cannot create claim. This policy has already been claimed.",
        400,
      );
    }

    if (policyStatusCode !== "ACTIVE" && policyStatusName !== "ACTIVE") {
      throw new AppError(
        "Policy is not active. Claims can only be created for active policies.",
        400,
      );
    }

    const existingClaim = await tx.claim.findUnique({
      where: { policyId: data.policyId },
    });

    if (existingClaim) {
      throw new AppError(
        "Cannot create claim. This policy has already been claimed.",
        400,
      );
    }

    const claimedStatus = await tx.policyStatusMaster.findFirst({
      where: {
        statusCode: { equals: "CLAIMED", mode: "insensitive" },
      },
    });

    if (!claimedStatus) {
      throw new AppError("Claimed policy status not found.", 500);
    }

    const newClaim = await tx.claim.create({
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

    await tx.policy.update({
      where: { id: data.policyId },
      data: {
        statusId: claimedStatus.id,
      },
    });

    return await tx.claim.findUnique({
      where: { id: newClaim.id },
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

const normalizeClaimType = (claimType: string) => {
  const normalized = claimType?.trim();
  if (!normalized) return "";

  if (normalized === "Surrendered") return "Surrender";
  if (normalized === "Maturity Claimed") return "Maturity";

  return normalized;
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

const roundToTwoDecimals = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const calculateDeathClaim = ({
  sumAssured,
  reversionaryBonus,
  finalAdditionalBonus,
  outstandingLoan,
  loanInterest,
}: {
  sumAssured: number;
  reversionaryBonus: number;
  finalAdditionalBonus: number;
  outstandingLoan: number;
  loanInterest: number;
}) =>
  Math.max(
    0,
    roundToTwoDecimals(
      sumAssured +
        reversionaryBonus +
        finalAdditionalBonus -
        outstandingLoan -
        loanInterest,
    ),
  );

interface MaturityClaimInput {
  sumAssured: number;
  bonus: number;
  loyaltyAddition: number;
  outstandingLoan: number;
  loanInterest: number;
}

const calculateMaturityClaim = ({
  sumAssured,
  bonus,
  loyaltyAddition,
  outstandingLoan,
  loanInterest,
}: MaturityClaimInput): number =>
  Math.max(
    0,
    roundToTwoDecimals(
      sumAssured + bonus + loyaltyAddition - outstandingLoan - loanInterest,
    ),
  );

const calculateSurrenderClaim = ({
  basicPremium,
  numberOfPremiumsPaid,
  outstandingLoan,
  loanInterest,
  gsvPercentage,
  ssvPercentage,
  bonus,
}: {
  basicPremium: number;
  numberOfPremiumsPaid: number;
  outstandingLoan: number;
  loanInterest: number;
  gsvPercentage: number;
  ssvPercentage: number;
  bonus: number;
}) => {
  const paidPremium = basicPremium * numberOfPremiumsPaid;
  const guaranteedSurrenderValue = paidPremium * gsvPercentage;
  const specialSurrenderValue = paidPremium * ssvPercentage;
  const surrenderValue = Math.max(
    guaranteedSurrenderValue,
    specialSurrenderValue,
  );

  return Math.max(
    0,
    roundToTwoDecimals(surrenderValue + bonus - outstandingLoan - loanInterest),
  );
};

/**
 * Calculate loan interest dynamically from the active loan details.
 * Loan Interest = (Outstanding Loan × Interest Rate × Loan Tenure in Months) /
 * (100 × 12)
 */
const calculateAutoLoanInterest = (
  loanAmount: number | null | undefined,
  interestRate: number | null | undefined,
  _loanDate: Date | string | null | undefined,
  _claimDate: Date | string,
  loanTenureMonths?: number | null | undefined,
): number => {
  const principal = Math.max(0, toNumber(loanAmount));
  const rate = Math.max(0, toNumber(interestRate));
  const tenureInMonths = Math.max(0, toNumber(loanTenureMonths));

  if (principal === 0 || rate === 0 || tenureInMonths === 0) {
    return 0;
  }

  const interest = (principal * rate * tenureInMonths) / (100 * 12);
  return roundToTwoDecimals(Math.max(0, interest));
};

const isActiveOrOutstandingLoan = (loan: any) => {
  const statusCode = String(loan?.loanStatus?.statusCode ?? "")
    .trim()
    .toUpperCase();
  const statusName = String(loan?.loanStatus?.statusName ?? "")
    .trim()
    .toUpperCase();

  return (
    statusCode === "ACTIVE" ||
    statusCode === "OUTSTANDING" ||
    statusName === "ACTIVE" ||
    statusName === "OUTSTANDING"
  );
};

const getLatestActiveOutstandingLoan = (loans: any[] = []) => {
  const applicableLoans = loans.filter((loan) =>
    isActiveOrOutstandingLoan(loan),
  );

  if (applicableLoans.length === 0) return null;

  return applicableLoans.sort((a, b) => {
    const dateA = a?.loanDate ? new Date(a.loanDate).getTime() : 0;
    const dateB = b?.loanDate ? new Date(b.loanDate).getTime() : 0;
    return dateB - dateA;
  })[0];
};

export const calculateClaimAmount = async (
  policyId: string,
  claimType: string,
  claimDate?: string,
) => {
  if (!policyId) {
    throw new Error("Policy ID is required.");
  }

  const policy = await prisma.policy.findUnique({
    where: { id: policyId },
    include: {
      premium: true,
      loans: {
        include: {
          loanStatus: {
            select: {
              statusCode: true,
            },
          },
        },
      },
      premiumPayments: {
        include: {
          paymentStatus: true,
        },
      },
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

  const normalizedClaimType = normalizeClaimType(claimType);
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
  const loyaltyAddition = findAttributeValue(
    policy.policyAttributes,
    ["LOYALTY_ADDITION"],
    ["Loyalty Addition"],
  );
  const bonus = reversionaryBonus + finalAdditionalBonus;

  const dateForCalculation = claimDate ? new Date(claimDate) : new Date();

  const activeLoan = getLatestActiveOutstandingLoan(policy.loans);
  const outstandingLoan = activeLoan
    ? Math.max(
        0,
        toNumber(activeLoan.loanAmount) - toNumber(activeLoan.loanRepaidAmount),
      )
    : 0;

  const loanInterest = activeLoan
    ? calculateAutoLoanInterest(
        outstandingLoan,
        activeLoan.interestRate,
        activeLoan.loanDate,
        dateForCalculation,
        activeLoan.loanTenure,
      )
    : 0;

  const maturityOutstandingLoan = outstandingLoan;
  const maturityLoanInterest = loanInterest;

  const basicPremium =
    toNumber(policy.premium?.basicYearlyPremium) ||
    toNumber(policy.premium?.installmentPremium);
  const numberOfPremiumsPaid = policy.premiumPayments.filter((payment) => {
    const statusCode = payment.paymentStatus?.statusCode;
    return statusCode === "PAID" || statusCode === "Paid";
  }).length;

  const gsvPercentage =
    findAttributeValue(
      policy.policyAttributes,
      ["GSV_PERCENTAGE", "GSV_PERCENT", "GSV"],
      [
        "Guaranteed Surrender Value Percentage",
        "Guaranteed Surrender Percentage",
        "GSV %",
      ],
    ) / 100 || 0.3;

  const ssvPercentage =
    findAttributeValue(
      policy.policyAttributes,
      ["SSV_PERCENTAGE", "SSV_PERCENT", "SSV"],
      [
        "Special Surrender Value Percentage",
        "Special Surrender Percentage",
        "SSV %",
      ],
    ) / 100 || 0.35;

  const calculation = {
    sumAssured,
    reversionaryBonus,
    finalAdditionalBonus,
    loyaltyAddition,
    outstandingLoan,
    loanInterest,
  };

  let maxClaimAmount: number | null = null;

  if (normalizedClaimType === "Death") {
    maxClaimAmount = calculateDeathClaim({
      sumAssured,
      reversionaryBonus,
      finalAdditionalBonus,
      outstandingLoan,
      loanInterest,
    });
  }

  if (normalizedClaimType === "Maturity") {
    maxClaimAmount = calculateMaturityClaim({
      sumAssured,
      bonus,
      loyaltyAddition,
      outstandingLoan: maturityOutstandingLoan,
      loanInterest: maturityLoanInterest,
    });
  }

  if (normalizedClaimType === "Surrender") {
    maxClaimAmount = calculateSurrenderClaim({
      basicPremium,
      numberOfPremiumsPaid,
      outstandingLoan,
      loanInterest,
      gsvPercentage: gsvPercentage || 0.3,
      ssvPercentage: ssvPercentage || 0.35,
      bonus,
    });
  }

  return {
    maxClaimAmount,
    calculation,
  };
};

export { calculateDeathClaim, calculateMaturityClaim, calculateSurrenderClaim };

/**
 * Get loan details and calculate loan interest for a policy
 * Used by frontend to display loan information and auto-calculated interest
 *
 * @param policyId - ID of the policy
 * @param claimDate - Date for which to calculate interest (optional, uses current date if not provided)
 * @returns Object containing loan details and calculated interest
 */
export const getLoanDetailsWithCalculatedInterest = async (
  policyId: string,
  claimDate?: string,
) => {
  if (!policyId) {
    throw new Error("Policy ID is required.");
  }

  const policy = await prisma.policy.findUnique({
    where: { id: policyId },
    select: {
      loans: {
        include: {
          loanStatus: {
            select: {
              statusCode: true,
              statusName: true,
            },
          },
        },
      },
    },
  });

  if (!policy) {
    throw new Error("Policy not found.");
  }

  const dateForCalculation = claimDate ? new Date(claimDate) : new Date();

  if (!policy.loans || policy.loans.length === 0) {
    return {
      loanAmount: 0,
      interestRate: 0,
      loanDate: null,
      loanTenure: 0,
      loanStatus: null,
      loanInterest: 0,
      outstandingLoan: 0,
    };
  }

  const loan = getLatestActiveOutstandingLoan(policy.loans) ?? policy.loans[0];

  const loanAmount = toNumber(loan.loanAmount);
  const loanRepaidAmount = toNumber(loan.loanRepaidAmount);
  const outstandingLoan = Math.max(0, loanAmount - loanRepaidAmount);
  const interestRate = toNumber(loan.interestRate);
  const loanTenure = toNumber(loan.loanTenure);

  const loanInterest = calculateAutoLoanInterest(
    outstandingLoan,
    interestRate,
    loan.loanDate,
    dateForCalculation,
    loanTenure,
  );

  return {
    loanAmount: loanAmount,
    interestRate,
    loanDate: loan.loanDate,
    loanTenure,
    loanStatus:
      loan.loanStatus?.statusCode ?? loan.loanStatus?.statusName ?? null,
    loanInterest,
    outstandingLoan,
  };
};
