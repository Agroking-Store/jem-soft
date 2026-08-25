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

/* ═══════════════════════════════════════════════════════════
 * HELPERS
 * ═══════════════════════════════════════════════════════════ */

const toNumber = (value: any): number => {
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

const round2 = (v: number): number =>
  Math.round((v + Number.EPSILON) * 100) / 100;

const findAttributeValue = (
  policyAttributes: any[] | undefined,
  codes: string[],
  names: string[],
): number => {
  if (!policyAttributes) return 0;
  const attr = policyAttributes.find((pa) => {
    const code = pa.attribute?.attributeCode;
    const name = pa.attribute?.attributeName;
    return codes.includes(code) || names.includes(name);
  });
  return attr ? toNumber(attr.value) : 0;
};

/* ═══════════════════════════════════════════════════════════
 * LOAN OUTSTANDING (uses new LoanRepayment table)
 * ═══════════════════════════════════════════════════════════ */

/**
 * Compute outstanding principal + accrued interest for a loan
 * as of a given date, using the LoanRepayment audit trail.
 */
function computeLoanOutstanding(loan: any, asOfDate: Date) {
  const loanAmount = toNumber(loan.loanAmount);
  const interestRate = toNumber(loan.interestRate);
  const repayments = loan.repayments || [];

  const totalPrincipalRepaid = repayments.reduce(
    (sum: number, r: any) => sum + toNumber(r.principalComponent),
    0,
  );
  const totalInterestPaid = repayments.reduce(
    (sum: number, r: any) => sum + toNumber(r.interestComponent),
    0,
  );

  const outstandingPrincipal = Math.max(0, loanAmount - totalPrincipalRepaid);

  // Find last payment date (or loan date if no payments)
  const lastPaymentDate =
    repayments.length > 0
      ? new Date(
          repayments.reduce((latest: any, r: any) =>
            new Date(r.repaymentDate) > new Date(latest.repaymentDate)
              ? r
              : latest,
          ).repaymentDate,
        )
      : new Date(loan.loanDate);

  const daysSince = Math.max(
    0,
    Math.floor(
      (asOfDate.getTime() - lastPaymentDate.getTime()) / (1000 * 60 * 60 * 24),
    ),
  );

  // Standard simple interest: (P × R × D) / 36500
  const accruedInterest =
    outstandingPrincipal > 0 && interestRate > 0
      ? round2((outstandingPrincipal * interestRate * daysSince) / 36500)
      : 0;

  return {
    loanAmount,
    outstandingPrincipal: round2(outstandingPrincipal),
    accruedInterest,
    totalPrincipalRepaid: round2(totalPrincipalRepaid),
    totalInterestPaid: round2(totalInterestPaid),
    totalDue: round2(outstandingPrincipal + accruedInterest),
    interestRate,
    lastPaymentDate,
    daysSinceLastPayment: daysSince,
  };
}

const isActiveLoan = (loan: any): boolean => {
  const code = String(loan?.loanStatus?.statusCode ?? "")
    .trim()
    .toUpperCase();
  return code === "ACTIVE";
};

const getActiveLoan = (loans: any[] = []) => {
  const active = loans.filter(isActiveLoan);
  if (active.length === 0) return null;
  return active.sort(
    (a, b) => new Date(b.loanDate).getTime() - new Date(a.loanDate).getTime(),
  )[0];
};

/* ═══════════════════════════════════════════════════════════
 * CLAIM AMOUNT CALCULATIONS
 * ═══════════════════════════════════════════════════════════ */

/**
 * DEATH CLAIM:
 * Payable = Sum Assured + Reversionary Bonus + Final Additional Bonus
 *         − Outstanding Loan − Accrued Interest
 */
const calculateDeathClaim = (
  sumAssured: number,
  reversionaryBonus: number,
  finalAdditionalBonus: number,
  outstandingLoan: number,
  loanInterest: number,
): number =>
  Math.max(
    0,
    round2(
      sumAssured +
        reversionaryBonus +
        finalAdditionalBonus -
        outstandingLoan -
        loanInterest,
    ),
  );

/**
 * MATURITY CLAIM:
 * Payable = Sum Assured + Vested Bonuses + Loyalty Addition
 *         − Outstanding Loan − Accrued Interest
 */
const calculateMaturityClaim = (
  sumAssured: number,
  bonus: number,
  loyaltyAddition: number,
  outstandingLoan: number,
  loanInterest: number,
): number =>
  Math.max(
    0,
    round2(
      sumAssured + bonus + loyaltyAddition - outstandingLoan - loanInterest,
    ),
  );

/**
 * SURRENDER CLAIM:
 * Surrender Value = MAX(GSV, SSV) + Bonus
 * Payable = Surrender Value − Outstanding Loan − Accrued Interest
 *
 * GSV = Total Premium Paid × GSV %
 * SSV = Total Premium Paid × SSV %
 */
const calculateSurrenderClaim = (
  basicPremium: number,
  numberOfPremiumsPaid: number,
  outstandingLoan: number,
  loanInterest: number,
  gsvPercentage: number,
  ssvPercentage: number,
  bonus: number,
): { amount: number; gsv: number; ssv: number; surrenderValue: number } => {
  const totalPaidPremium = basicPremium * numberOfPremiumsPaid;
  const gsv = round2(totalPaidPremium * gsvPercentage);
  const ssv = round2(totalPaidPremium * ssvPercentage);
  const surrenderValue = Math.max(gsv, ssv);

  return {
    amount: Math.max(
      0,
      round2(surrenderValue + bonus - outstandingLoan - loanInterest),
    ),
    gsv,
    ssv,
    surrenderValue,
  };
};

/* ═══════════════════════════════════════════════════════════
 * CRUD OPERATIONS
 * ═══════════════════════════════════════════════════════════ */

export const getAllClaims = async () => {
  return await prisma.claim.findMany({
    include: {
      policy: {
        select: {
          policyNumber: true,
          CustomerMaster: {
            select: { firstName: true, lastName: true },
          },
        },
      },
      nominee: {
        select: { id: true, nomineeName: true, relationship: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

export const getClaimById = async (id: string): Promise<any> => {
  return prisma.claim.findUnique({
    where: { id },
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

export const getClaimByIdWithDocuments = async (id: string) =>
  prisma.claim.findUnique({
    where: { id },
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
      documents: { orderBy: { createdAt: "desc" } },
    },
  });

export const createClaim = async (data: ClaimData, userId: string) => {
  // Validate nominee belongs to policy
  if (data.nomineeId) {
    const nominee = await prisma.nominee.findUnique({
      where: { id: data.nomineeId },
      select: { policyId: true },
    });
    if (!nominee || nominee.policyId !== data.policyId) {
      throw new AppError(
        "Selected nominee does not belong to the selected policy.",
        400,
      );
    }
  }

  return await prisma.$transaction(async (tx) => {
    const policy = await tx.policy.findUnique({
      where: { id: data.policyId },
      include: { status: true },
    });

    if (!policy) throw new AppError("Policy not found.", 404);

    const statusCode = String(policy.status?.statusCode ?? "")
      .trim()
      .toUpperCase();
    if (statusCode === "CLAIMED") {
      throw new AppError("This policy has already been claimed.", 400);
    }
    if (statusCode !== "ACTIVE") {
      throw new AppError(
        "Claims can only be created for active policies.",
        400,
      );
    }

    const existingClaim = await tx.claim.findUnique({
      where: { policyId: data.policyId },
    });
    if (existingClaim) {
      throw new AppError("This policy already has a claim.", 400);
    }

    const claimedStatus = await tx.policyStatusMaster.findFirst({
      where: { statusCode: { equals: "CLAIMED", mode: "insensitive" } },
    });
    if (!claimedStatus)
      throw new AppError("Claimed policy status not found.", 500);

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
    });

    // Update policy status to CLAIMED
    await tx.policy.update({
      where: { id: data.policyId },
      data: { statusId: claimedStatus.id },
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
        throw new AppError(
          "Selected nominee does not belong to the selected policy.",
          400,
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
  return await prisma.$transaction(async (tx) => {
    const claim = await tx.claim.findUnique({
      where: { id },
      select: { id: true, policyId: true },
    });
    if (!claim) throw new AppError("Claim not found.", 404);

    const policy = await tx.policy.findUnique({
      where: { id: claim.policyId },
      include: { status: true },
    });
    if (!policy) throw new AppError("Policy not found.", 404);

    await tx.claim.delete({ where: { id } });

    // Restore policy to ACTIVE if it was CLAIMED
    const statusCode = String(policy.status?.statusCode ?? "")
      .trim()
      .toUpperCase();
    if (statusCode === "CLAIMED") {
      const activeStatus = await tx.policyStatusMaster.findFirst({
        where: { statusCode: { equals: "ACTIVE", mode: "insensitive" } },
      });
      if (activeStatus) {
        await tx.policy.update({
          where: { id: claim.policyId },
          data: { statusId: activeStatus.id },
        });
      }
    }

    return { id: claim.id, policyId: claim.policyId };
  });
};

/* ═══════════════════════════════════════════════════════════
 * CLAIM AMOUNT CALCULATION (Main Function)
 * ═══════════════════════════════════════════════════════════ */

export const calculateClaimAmount = async (
  policyId: string,
  claimType: string,
  claimDate?: string,
) => {
  if (!policyId) throw new AppError("Policy ID is required.", 400);

  const policy = await prisma.policy.findUnique({
    where: { id: policyId },
    include: {
      premium: true,
      loans: {
        include: {
          loanStatus: {
            select: { statusCode: true, statusName: true },
          },
          repayments: {
            select: {
              repaymentDate: true,
              principalComponent: true,
              interestComponent: true,
            },
            orderBy: { repaymentDate: "desc" },
          },
        },
      },
      premiumPayments: { include: { paymentStatus: true } },
      policyAttributes: { include: { attribute: true } },
    },
  });

  if (!policy) throw new AppError("Policy not found.", 404);

  const dateForCalc = claimDate ? new Date(claimDate) : new Date();
  const normalizedType = claimType.trim();

  // ── Policy values ──
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

  // ── Loan deduction ──
  const activeLoan = getActiveLoan(policy.loans);
  const loanDetails = activeLoan
    ? computeLoanOutstanding(activeLoan, dateForCalc)
    : null;

  const outstandingLoan = loanDetails?.outstandingPrincipal ?? 0;
  const loanInterest = loanDetails?.accruedInterest ?? 0;

  // ── Surrender-specific values ──
  const basicPremium =
    toNumber(policy.premium?.basicYearlyPremium) ||
    toNumber(policy.premium?.installmentPremium);
  const numberOfPremiumsPaid = policy.premiumPayments.filter((p) => {
    const code = p.paymentStatus?.statusCode;
    return code === "PAID" || code === "Paid";
  }).length;

  const gsvPercentage =
    findAttributeValue(
      policy.policyAttributes,
      ["GSV_PERCENTAGE", "GSV_PERCENT", "GSV"],
      ["Guaranteed Surrender Value Percentage", "GSV %"],
    ) / 100 || 0.3;

  const ssvPercentage =
    findAttributeValue(
      policy.policyAttributes,
      ["SSV_PERCENTAGE", "SSV_PERCENT", "SSV"],
      ["Special Surrender Value Percentage", "SSV %"],
    ) / 100 || 0.35;

  // ── Calculate based on type ──
  let maxClaimAmount: number | null = null;
  let surrenderInfo: any = null;

  if (normalizedType === "Death") {
    maxClaimAmount = calculateDeathClaim(
      sumAssured,
      reversionaryBonus,
      finalAdditionalBonus,
      outstandingLoan,
      loanInterest,
    );
  } else if (normalizedType === "Maturity") {
    maxClaimAmount = calculateMaturityClaim(
      sumAssured,
      bonus,
      loyaltyAddition,
      outstandingLoan,
      loanInterest,
    );
  } else if (normalizedType === "Surrender") {
    const result = calculateSurrenderClaim(
      basicPremium,
      numberOfPremiumsPaid,
      outstandingLoan,
      loanInterest,
      gsvPercentage,
      ssvPercentage,
      bonus,
    );
    maxClaimAmount = result.amount;
    surrenderInfo = {
      gsv: result.gsv,
      ssv: result.ssv,
      surrenderValue: result.surrenderValue,
      basicPremium,
      numberOfPremiumsPaid,
      gsvPercentage: gsvPercentage * 100,
      ssvPercentage: ssvPercentage * 100,
    };
  }

  const grossAmount =
    maxClaimAmount !== null
      ? round2(maxClaimAmount + outstandingLoan + loanInterest)
      : null;

  return {
    maxClaimAmount,
    breakdown: {
      sumAssured,
      reversionaryBonus,
      finalAdditionalBonus,
      loyaltyAddition,
      bonus,
      outstandingLoan,
      loanInterest,
      totalDeduction: round2(outstandingLoan + loanInterest),
      grossAmount,
    },
    loanDetails: loanDetails
      ? {
          loanAmount: loanDetails.loanAmount,
          outstandingPrincipal: loanDetails.outstandingPrincipal,
          accruedInterest: loanDetails.accruedInterest,
          totalRepaid: loanDetails.totalPrincipalRepaid,
          interestRate: loanDetails.interestRate,
          daysSinceLastPayment: loanDetails.daysSinceLastPayment,
        }
      : null,
    surrenderInfo,
  };
};

/* ═══════════════════════════════════════════════════════════
 * LOAN DETAILS (for display)
 * ═══════════════════════════════════════════════════════════ */

export const getLoanDetailsWithCalculatedInterest = async (
  policyId: string,
  claimDate?: string,
) => {
  if (!policyId) throw new AppError("Policy ID is required.", 400);

  const policy = await prisma.policy.findUnique({
    where: { id: policyId },
    select: {
      loans: {
        include: {
          loanStatus: {
            select: { statusCode: true, statusName: true },
          },
          repayments: {
            select: {
              repaymentDate: true,
              principalComponent: true,
              interestComponent: true,
            },
            orderBy: { repaymentDate: "desc" },
          },
        },
      },
    },
  });

  if (!policy) throw new AppError("Policy not found.", 404);

  const dateForCalc = claimDate ? new Date(claimDate) : new Date();
  const activeLoan = getActiveLoan(policy.loans);

  if (!activeLoan) {
    return {
      loanAmount: 0,
      interestRate: 0,
      loanDate: null,
      loanStatus: null,
      loanInterest: 0,
      outstandingLoan: 0,
    };
  }

  const details = computeLoanOutstanding(activeLoan, dateForCalc);

  return {
    loanAmount: details.loanAmount,
    interestRate: toNumber(activeLoan.interestRate),
    loanDate: activeLoan.loanDate,
    loanStatus: activeLoan.loanStatus?.statusCode ?? null,
    loanInterest: details.accruedInterest,
    outstandingLoan: details.outstandingPrincipal,
  };
};

/* ═══════════════════════════════════════════════════════════
 * DOCUMENT MANAGEMENT
 * ═══════════════════════════════════════════════════════════ */

export interface ClaimDocumentData {
  claimId: string;
  fileName: string;
  originalName: string;
  fileUrl: string;
  fileType?: string;
  fileSize?: number;
}

export const createClaimDocument = async (data: ClaimDocumentData) =>
  prisma.claimDocument.create({ data });

export const getClaimDocuments = async (claimId: string) =>
  prisma.claimDocument.findMany({
    where: { claimId },
    orderBy: { createdAt: "desc" },
  });

export const getClaimDocumentById = async (documentId: string) =>
  prisma.claimDocument.findUnique({ where: { id: documentId } });

export const deleteClaimDocument = async (documentId: string) =>
  prisma.claimDocument.delete({ where: { id: documentId } });
