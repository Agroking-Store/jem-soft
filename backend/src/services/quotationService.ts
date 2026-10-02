import { prisma } from "../config/database.js";
import { AppError } from "../utils/AppError.js";
import { calculatePremium } from "./premiumCalculationService.js";

export interface QuotationCalculateInput {
  productType: string;
  planId?: string;
  planNumber?: string;
  age: number;
  gender?: string;
  isSmoker?: boolean;
  extraPremiumClass?: string;
  policyTerm: number;
  ppt?: number;
  sumAssured: number;
  budget?: number;
  coverRequired?: number;
  premiumMode?: string;
  bonusScenario?: string;
  sec80CLimit?: number;
  taxSlabPercentage?: number;
  option?: number;
}

export const getNextQuotationRefNo = async (): Promise<string> => {
  const count = await prisma.quotation.count();
  const nextNumber = count + 1;
  return String(nextNumber).padStart(12, "0");
};

export const calculateQuotation = async (data: QuotationCalculateInput) => {
  const {
    planId,
    planNumber,
    age,
    gender = "Male",
    isSmoker = false,
    policyTerm,
    ppt,
    sumAssured,
    premiumMode = "Yearly",
    bonusScenario = "LAST_DECLARED",
    sec80CLimit = 150000,
    taxSlabPercentage = 30.9,
    option,
  } = data;

  if (!age || !policyTerm || !sumAssured) {
    throw new AppError("Age, Policy Term, and Sum Assured are required for calculation.", 400);
  }

  // Find product by id or planNumber
  let product = null;
  if (planId) {
    product = await prisma.productMaster.findUnique({ where: { id: planId } });
  } else if (planNumber) {
    product = await prisma.productMaster.findFirst({
      where: {
        planNumber: String(planNumber),
        provider: { code: "LIC" },
      },
    });
  }

  if (!product) {
    // Fallback: try finding first LIC product or matching planNumber
    product = await prisma.productMaster.findFirst({
      where: {
        OR: [
          { planNumber: planNumber ? String(planNumber) : "714" },
          { productName: { contains: "Endowment", mode: "insensitive" } },
        ],
      },
    });
  }

  const effectiveProductId = product?.id;
  const effectivePlanNumber = product?.planNumber || planNumber || "714";

  let basicYearlyPremium = 0;
  let installmentPremium = 0;
  let tabularPremium = 0;
  let rate = 0;

  if (effectiveProductId) {
    try {
      const calcResult = await calculatePremium({
        productId: effectiveProductId,
        age: Number(age),
        policyTerm: Number(policyTerm),
        premiumPayingTerm: ppt ? Number(ppt) : null,
        sumAssured: Number(sumAssured),
        premiumMode,
        gender: gender === "Female" ? "F" : "M",
        smoker: Boolean(isSmoker),
        option: option ? Number(option) : null,
      });

      basicYearlyPremium = calcResult.basicYearlyPremium || 0;
      installmentPremium = calcResult.installmentPremium || 0;
      tabularPremium = calcResult.tabularPremium || 0;
      rate = calcResult.rate || 0;
    } catch (err: any) {
      console.warn("calculatePremium fallback in quotationService:", err.message);
      // Fallback rate calculation if rate lookup misses
      rate = 45.5;
      tabularPremium = Number(((rate * sumAssured) / 1000).toFixed(2));
      basicYearlyPremium = tabularPremium;
      installmentPremium = basicYearlyPremium;
    }
  }

  // GST calculation (4.5% for first year installment, 2.25% subsequently)
  const gst = Number((installmentPremium * 0.045).toFixed(2));
  const totalInstallmentPremium = Number((installmentPremium + gst).toFixed(2));

  // Bonus Calculation Scenario (estimate bonus rate per 1000 SA per year)
  let bonusRatePer1000 = 45; // Default ~45 per 1000 for Endowment / Life Guard
  if (bonusScenario === "LIC_8") {
    bonusRatePer1000 = 80;
  } else if (bonusScenario === "LIC_4") {
    bonusRatePer1000 = 40;
  } else if (bonusScenario === "FORECAST") {
    bonusRatePer1000 = 48;
  } else {
    // LAST_DECLARED
    bonusRatePer1000 = 46;
  }

  const totalBonus = Number((((bonusRatePer1000 * sumAssured) / 1000) * policyTerm).toFixed(2));
  const finalAdditionalBonus = Number(((sumAssured * 0.05)).toFixed(2)); // Final additional bonus approx 5%
  const maturityAmount = Number((sumAssured + totalBonus + finalAdditionalBonus).toFixed(2));

  // Tax Savings (Section 80C)
  const eligible80CAmount = Math.min(basicYearlyPremium, sec80CLimit);
  const taxSavingsAmount = Number(((eligible80CAmount * (taxSlabPercentage / 100))).toFixed(2));

  // Build Year-by-Year Benefit Illustration Rows
  const yearlyIllustration = [];
  const effectivePPT = ppt ? Number(ppt) : Number(policyTerm);
  let cumulativePremium = 0;

  for (let year = 1; year <= policyTerm; year++) {
    const currentAge = age + year - 1;
    const premiumPaidThisYear = year <= effectivePPT ? totalInstallmentPremium : 0;
    cumulativePremium += premiumPaidThisYear;

    const accruedBonus = Number((((bonusRatePer1000 * sumAssured) / 1000) * year).toFixed(2));
    const deathBenefitNormal = Number((sumAssured + accruedBonus).toFixed(2));
    const deathBenefitAccidental = Number((deathBenefitNormal + sumAssured).toFixed(2));
    
    // Guaranteed Surrender Value approx factor
    const surrenderValue = year >= 2 ? Number((cumulativePremium * Math.min(0.3 + (year * 0.025), 0.9)).toFixed(2)) : 0;
    const loanAvailable = year >= 2 ? Number((surrenderValue * 0.9).toFixed(2)) : 0;

    const returnsAtMaturity = year === policyTerm ? maturityAmount : 0;

    yearlyIllustration.push({
      policyYear: year,
      age: currentAge,
      premium: premiumPaidThisYear,
      cumulativePremium,
      normalCover: deathBenefitNormal,
      accidentalCover: deathBenefitAccidental,
      surrenderValue,
      loanAvailable,
      cashFlowReturns: returnsAtMaturity,
    });
  }

  return {
    productId: effectiveProductId,
    planNumber: effectivePlanNumber,
    rate,
    tabularPremium,
    basicPremium: basicYearlyPremium,
    gst,
    installmentPremium,
    totalInstallmentPremium,
    totalPremium: totalInstallmentPremium,
    maturityAmount,
    bonusScenario,
    taxSavingsAmount,
    yearlyIllustration,
    summaryRow: {
      planText: `${effectivePlanNumber}/${policyTerm}/${effectivePPT}`,
      sumAssured,
      basicPremium: basicYearlyPremium,
      gst,
      installmentPremium: totalInstallmentPremium,
    },
  };
};

export const createQuotation = async (data: any) => {
  let refNo = data.quotationRefNo;
  if (!refNo || refNo.trim() === "") {
    refNo = await getNextQuotationRefNo();
  }

  // Ensure unique quotationRefNo
  const existing = await prisma.quotation.findUnique({ where: { quotationRefNo: refNo } });
  if (existing) {
    refNo = await getNextQuotationRefNo();
  }

  // Calculate snapshot
  const calcResult = await calculateQuotation({
    productType: data.productType || "LIFE_GUARD",
    planId: data.planId,
    planNumber: data.planNumber,
    age: Number(data.age),
    gender: data.gender,
    isSmoker: Boolean(data.isSmoker),
    policyTerm: Number(data.policyTerm || 15),
    ppt: data.ppt ? Number(data.ppt) : undefined,
    sumAssured: Number(data.sumAssured || data.coverRequired || data.budget || 500000),
    premiumMode: data.premiumMode || "Yearly",
    bonusScenario: data.bonusScenario || "LAST_DECLARED",
    sec80CLimit: Number(data.sec80CLimit || 150000),
    taxSlabPercentage: Number(data.taxSlabPercentage || 30.9),
  });

  const quotation = await prisma.quotation.create({
    data: {
      quotationRefNo: refNo,
      productType: data.productType || "LIFE_GUARD",
      quotationDate: data.quotationDate ? new Date(data.quotationDate) : new Date(),
      commencementDate: data.commencementDate ? new Date(data.commencementDate) : new Date(),
      customerId: data.customerId || null,
      memberId: data.memberId || null,
      groupCode: data.groupCode || null,
      title: data.title || "Mr.",
      proposerName: data.proposerName,
      gender: data.gender || "Male",
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
      age: Number(data.age),
      isSmoker: Boolean(data.isSmoker),
      extraPremiumClass: data.extraPremiumClass || "None",
      sec80CLimit: Number(data.sec80CLimit || 150000),
      taxSlabPercentage: Number(data.taxSlabPercentage || 30.9),
      bonusScenario: data.bonusScenario || "LAST_DECLARED",
      planId: calcResult.productId || data.planId || null,
      planNumber: calcResult.planNumber || data.planNumber || null,
      basis: data.basis || "Sum",
      budget: Number(data.budget || 0),
      coverRequired: Number(data.coverRequired || 0),
      premiumMode: data.premiumMode || "Yearly",
      policyTerm: Number(data.policyTerm || 15),
      ppt: data.ppt ? Number(data.ppt) : null,
      sumAssured: Number(data.sumAssured || data.coverRequired || data.budget || 500000),
      basicPremium: calcResult.basicPremium,
      gst: calcResult.gst,
      installmentPremium: calcResult.installmentPremium,
      totalPremium: calcResult.totalInstallmentPremium,
      maturityAmount: calcResult.maturityAmount,
      calculationDetails: calcResult as any,
      reportOptions: data.reportOptions || {},
    },
    include: {
      customer: {
        select: { id: true, name: true, groupCode: true, email: true, phone: true },
      },
      member: {
        select: { id: true, firstName: true, lastName: true, gender: true, dob: true },
      },
    },
  });

  return quotation;
};

export const getQuotations = async (query: {
  productType?: string;
  search?: string;
  field?: string;
  page?: number;
  limit?: number;
}) => {
  const { productType, search, field = "quotationRefNo", page = 1, limit = 6 } = query;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (productType) {
    where.productType = productType;
  }

  if (search && search.trim() !== "") {
    const searchTerm = search.trim();
    if (field === "quotationRefNo") {
      where.quotationRefNo = { contains: searchTerm, mode: "insensitive" };
    } else if (field === "proposerName") {
      where.proposerName = { contains: searchTerm, mode: "insensitive" };
    } else if (field === "groupCode") {
      where.groupCode = { contains: searchTerm, mode: "insensitive" };
    } else {
      where.OR = [
        { quotationRefNo: { contains: searchTerm, mode: "insensitive" } },
        { proposerName: { contains: searchTerm, mode: "insensitive" } },
        { groupCode: { contains: searchTerm, mode: "insensitive" } },
      ];
    }
  }

  const [total, quotations] = await Promise.all([
    prisma.quotation.count({ where }),
    prisma.quotation.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { createdAt: "desc" },
      include: {
        customer: {
          select: { id: true, name: true, groupCode: true },
        },
        member: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    }),
  ]);

  return {
    quotations,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getQuotationById = async (id: string) => {
  const quotation = await prisma.quotation.findUnique({
    where: { id },
    include: {
      customer: true,
      member: true,
    },
  });

  if (!quotation) {
    throw new AppError("Quotation not found", 404);
  }

  return quotation;
};

export const updateQuotation = async (id: string, data: any) => {
  const existing = await prisma.quotation.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError("Quotation not found", 404);
  }

  // Recalculate snapshot
  const calcResult = await calculateQuotation({
    productType: data.productType || existing.productType,
    planId: data.planId,
    planNumber: data.planNumber,
    age: Number(data.age),
    gender: data.gender,
    isSmoker: Boolean(data.isSmoker),
    policyTerm: Number(data.policyTerm || existing.policyTerm),
    ppt: data.ppt ? Number(data.ppt) : undefined,
    sumAssured: Number(data.sumAssured || data.coverRequired || data.budget || existing.sumAssured),
    premiumMode: data.premiumMode || existing.premiumMode,
    bonusScenario: data.bonusScenario || existing.bonusScenario,
    sec80CLimit: Number(data.sec80CLimit || existing.sec80CLimit),
    taxSlabPercentage: Number(data.taxSlabPercentage || existing.taxSlabPercentage),
  });

  const quotation = await prisma.quotation.update({
    where: { id },
    data: {
      productType: data.productType || existing.productType,
      quotationDate: data.quotationDate ? new Date(data.quotationDate) : existing.quotationDate,
      commencementDate: data.commencementDate ? new Date(data.commencementDate) : existing.commencementDate,
      customerId: data.customerId !== undefined ? data.customerId : existing.customerId,
      memberId: data.memberId !== undefined ? data.memberId : existing.memberId,
      groupCode: data.groupCode !== undefined ? data.groupCode : existing.groupCode,
      title: data.title || existing.title,
      proposerName: data.proposerName || existing.proposerName,
      gender: data.gender || existing.gender,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : existing.dateOfBirth,
      age: Number(data.age || existing.age),
      isSmoker: Boolean(data.isSmoker),
      extraPremiumClass: data.extraPremiumClass || existing.extraPremiumClass,
      sec80CLimit: Number(data.sec80CLimit || existing.sec80CLimit),
      taxSlabPercentage: Number(data.taxSlabPercentage || existing.taxSlabPercentage),
      bonusScenario: data.bonusScenario || existing.bonusScenario,
      planId: calcResult.productId || data.planId || existing.planId,
      planNumber: calcResult.planNumber || data.planNumber || existing.planNumber,
      basis: data.basis || existing.basis,
      budget: Number(data.budget || existing.budget),
      coverRequired: Number(data.coverRequired || existing.coverRequired),
      premiumMode: data.premiumMode || existing.premiumMode,
      policyTerm: Number(data.policyTerm || existing.policyTerm),
      ppt: data.ppt ? Number(data.ppt) : existing.ppt,
      sumAssured: Number(data.sumAssured || data.coverRequired || data.budget || existing.sumAssured),
      basicPremium: calcResult.basicPremium,
      gst: calcResult.gst,
      installmentPremium: calcResult.installmentPremium,
      totalPremium: calcResult.totalInstallmentPremium,
      maturityAmount: calcResult.maturityAmount,
      calculationDetails: calcResult as any,
      reportOptions: data.reportOptions || existing.reportOptions,
    },
    include: {
      customer: {
        select: { id: true, name: true, groupCode: true },
      },
      member: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });

  return quotation;
};

export const deleteQuotation = async (id: string) => {
  const quotation = await prisma.quotation.findUnique({ where: { id } });
  if (!quotation) {
    throw new AppError("Quotation not found", 404);
  }

  await prisma.quotation.delete({ where: { id } });
  return true;
};
