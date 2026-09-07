import { prisma } from "../config/database.js";
import { AppError } from "../utils/AppError.js";
import rebateService from "./rebateService.js";

import { calculateLIC714 } from "./premiumcalculators/lic714Calculator.js";
import { calculateLIC717 } from "./premiumcalculators/lic717Calculator.js";
import { calculateLIC748 } from "./premiumcalculators/lic748Calculator.js";
import { calculateLIC771 } from "./premiumcalculators/lic771Calculator.js";
import { calculateLIC745 } from "./premiumcalculators/lic745Calculator.js";
import { calculateLIC883 } from "./premiumcalculators/lic883Calculator.js";
import { calculateLIC736 } from "./premiumcalculators/lic736Calculator.js";
import { calculateLIC720 } from "./premiumcalculators/lic720Calculator.js";
import { calculateLIC888 } from "./premiumcalculators/lic888Calculator.js";
import { calculateLIC889 } from "./premiumcalculators/lic889Calculator.js";
import { calculateLIC774 } from "./premiumcalculators/lic774Calculator.js";
import { calculateLIC887 } from "./premiumcalculators/lic887Calculator.js";

interface PremiumInput {
  productId: string;
  age: number;
  secondaryAge?: number | null;
  gender?: string | null;
  smoker?: boolean | null;
  option?: number | null;
  policyTerm: number; // Actual Policy Term
  premiumPayingTerm?: number | null;
  sumAssured: number;
  premiumMode: string;
}

export interface CalculatorInput {
  productId: string;
  premiumMode: string;
  age: number;
  policyTerm: number;
  premiumPayingTerm?: number | null;
  sumAssured: number;
  tabularPremium: number;
  rate: number;
}

function parseRequiredInt(value: unknown, fieldName: string): number {
  if (
    value === undefined ||
    value === null ||
    (typeof value === "string" && value.trim() === "")
  ) {
    throw new AppError(`Invalid ${fieldName}`, 400);
  }

  const parsedValue = Number(value);
  if (!Number.isInteger(parsedValue)) {
    throw new AppError(`Invalid ${fieldName}`, 400);
  }

  return parsedValue;
}

function parseOptionalInt(
  value: unknown,
  fieldName: string,
): number | null | undefined {
  if (value === null) return null;
  if (
    value === undefined ||
    (typeof value === "string" && value.trim() === "")
  ) {
    return undefined;
  }

  const parsedValue = Number(value);
  if (!Number.isInteger(parsedValue)) {
    throw new AppError(`Invalid ${fieldName}`, 400);
  }

  return parsedValue;
}

export async function getModeFactor(productId: string, premiumMode: string) {
  const premiumModeRecord = await prisma.premiumModeMaster.findFirst({
    where: {
      OR: [
        {
          modeName: {
            equals: premiumMode,
            mode: "insensitive",
          },
        },
        {
          modeCode: {
            equals: premiumMode,
            mode: "insensitive",
          },
        },
      ],
    },
    select: {
      id: true,
    },
  });

  if (premiumModeRecord) {
    const factorRecord = await prisma.productPremiumModeFactor.findFirst({
      where: {
        productId,
        premiumModeId: premiumModeRecord.id,
      },
      select: {
        factor: true,
      },
    });

    if (factorRecord) {
      return Number(factorRecord.factor);
    }
  }

  switch (premiumMode.toUpperCase()) {
    case "Y":
    case "YEARLY":
    case "SINGLE":
    case "O":
      return 1;

    case "H":
    case "HALF-YEARLY":
      return 0.51;

    case "Q":
    case "QUARTERLY":
      return 0.26;

    case "M":
    case "MONTHLY":
      return 0.088;

    default:
      return 1;
  }
}

export async function calculatePremium(data: PremiumInput) {
  const age = parseRequiredInt(data.age, "entry age");
  const secondaryAge = parseOptionalInt(data.secondaryAge, "secondary age");
  const policyTerm = parseRequiredInt(data.policyTerm, "policy term");
  const premiumPayingTerm = parseOptionalInt(
    data.premiumPayingTerm,
    "premium paying term",
  );
  const option = parseOptionalInt(data.option, "option");
  const sumAssured = parseRequiredInt(data.sumAssured, "sum assured");

  const normalizedGender =
    data.gender == null ? null : String(data.gender).trim();

  const normalizedSmoker =
    data.smoker === true || data.smoker === false ? data.smoker : null;

  const normalizedPremiumMode =
    data.premiumMode == null ? "" : String(data.premiumMode).trim();

  const normalizedData = {
    ...data,
    age,
    secondaryAge,
    policyTerm,
    premiumPayingTerm,
    option,
    sumAssured,
    premiumMode: normalizedPremiumMode,
    gender:
      normalizedGender === "Male" || normalizedGender === "MALE"
        ? "M"
        : normalizedGender === "Female" || normalizedGender === "FEMALE"
          ? "F"
          : normalizedGender,
    smoker: normalizedSmoker,
  };

  Object.assign(data, normalizedData);

  const activeGender = data.gender;
  const activeSmoker = data.smoker;

  // ==========================================
  // STEP 1 : Get Product
  // ==========================================

  const product = await prisma.productMaster.findUnique({
    where: {
      id: data.productId,
    },
    select: {
      planNumber: true,
    },
  });

  if (!product) {
    throw new AppError("Product not found", 404);
  }

  // ==========================================
  // STEP 2 : Premium Lookup Term
  // ==========================================

  const usesPptLookup =
    product.planNumber !== null &&
    ["771", "745", "883"].includes(product.planNumber);

  if (usesPptLookup && premiumPayingTerm == null) {
    throw new AppError(
      `PPT / Gua. Addn. Period is required for LIC Plan ${product.planNumber}`,
      400,
    );
  }

  // Now TypeScript knows this is definitely a number
  const validatedPPT = premiumPayingTerm!;

  const lookupTerm: number = usesPptLookup ? validatedPPT : policyTerm;
  // ==========================================
  // STEP 3 : Premium Rate
  // ==========================================

  let premiumRate;

  if (product.planNumber === "888") {
    // ------------------------------------------
    // PLAN 888 - JEEVAN SATHI
    // ------------------------------------------

    if (secondaryAge == null) {
      throw new AppError(
        "Secondary / spouse age is required for LIC Plan 888",
        400,
      );
    }

    if (option == null) {
      throw new AppError("Option is required for LIC Plan 888", 400);
    }

    premiumRate = await prisma.productPremiumRate.findFirst({
      where: {
        productId: data.productId,
        entryAge: age,
        secondaryAge,
        policyTerm,
        premiumPayingTerm: null,
        option,
      },
    });
  } // ========================================================
  // PLAN 889
  // ========================================================
  else if (product.planNumber === "889") {
    if (secondaryAge == null) {
      throw new AppError(
        "Secondary / spouse age is required for LIC Plan 889",
        400,
      );
    }

    if (option == null) {
      throw new AppError("Option is required for LIC Plan 889", 400);
    }

    if (premiumPayingTerm == null) {
      throw new AppError(
        "Premium Paying Term is required for LIC Plan 889",
        400,
      );
    }

    premiumRate = await prisma.productPremiumRate.findFirst({
      where: {
        productId: data.productId,
        entryAge: age,
        secondaryAge,
        policyTerm,
        premiumPayingTerm,
        option,
      },
    });
  }

  // ========================================================
  // PLAN 774
  // ========================================================
  else if (product.planNumber === "774") {
    if (option == null) {
      throw new AppError("Option is required for LIC Plan 774", 400);
    }

    if (premiumPayingTerm == null) {
      throw new AppError(
        "Premium Paying Term is required for LIC Plan 774",
        400,
      );
    }

    premiumRate = await prisma.productPremiumRate.findFirst({
      where: {
        productId: data.productId,
        entryAge: age,
        policyTerm,
        premiumPayingTerm,
        option,
      },
    });
  }

  // ========================================================
  // PLAN 881
  // ========================================================
  else if (product.planNumber === "881") {
    if (option == null) {
      throw new AppError("Option is required for LIC Plan 881", 400);
    }

    if (premiumPayingTerm == null) {
      throw new AppError(
        "Premium Paying Term is required for LIC Plan 881",
        400,
      );
    }

    premiumRate = await prisma.productPremiumRate.findFirst({
      where: {
        productId: data.productId,
        entryAge: age,
        policyTerm,
        premiumPayingTerm,
        option,
      },
    });
  }

  // ========================================================
  // PLAN 912
  // ========================================================
  else if (product.planNumber === "912") {
    if (option == null) {
      throw new AppError("Option is required for LIC Plan 912", 400);
    }

    if (premiumPayingTerm == null) {
      throw new AppError(
        "Premium Paying Term is required for LIC Plan 912",
        400,
      );
    }

    premiumRate = await prisma.productPremiumRate.findFirst({
      where: {
        productId: data.productId,
        entryAge: age,
        policyTerm,
        premiumPayingTerm,
        option,
      },
    });
  } else if (product.planNumber === "887") {
    if (option == null) {
      throw new AppError("Option is required for LIC Plan 887", 400);
    }

    if (activeGender == null) {
      throw new AppError("Gender is required for LIC Plan 887", 400);
    }

    if (activeSmoker == null) {
      throw new AppError("Smoker status is required for LIC Plan 887", 400);
    }

    if (premiumPayingTerm == null) {
      throw new AppError("Premium Paying Term is required for LIC Plan 887", 400);
    }

    premiumRate = await prisma.productPremiumRate.findFirst({
      where: {
        productId: data.productId,
        entryAge: age,
        secondaryAge: null,
        gender: activeGender,
        smoker: activeSmoker,
        policyTerm,
        premiumPayingTerm,
        option,
      },
    });
  } else {
    // ------------------------------------------
    // EXISTING PLANS
    // ------------------------------------------

    const premiumPayingTermFilter =
      premiumPayingTerm == null ? undefined : premiumPayingTerm;

    premiumRate = await prisma.productPremiumRate.findFirst({
      where: {
        productId: data.productId,
        entryAge: age,
        policyTerm: lookupTerm,
        premiumPayingTerm: premiumPayingTermFilter,
      },
    });

    if (!premiumRate) {
      premiumRate = await prisma.productPremiumRate.findFirst({
        where: {
          productId: data.productId,
          entryAge: age,
          policyTerm: lookupTerm,
          premiumPayingTerm: undefined,
        },
      });
    }
  }

  if (!premiumRate) {
    throw new AppError(
      product.planNumber === "888"
        ? `Premium rate not found for Primary Age ${data.age}, Secondary Age ${data.secondaryAge}, Term ${data.policyTerm}, Option ${data.option}`
        : `Premium rate not found for Age ${data.age}, Lookup Term ${lookupTerm}`,
      404,
    );
  }

  // ==========================================
  // STEP 4 : Tabular Premium
  // ==========================================

  const rate = Number(premiumRate.tabularRate);

  const tabularPremium = Number(((rate * data.sumAssured) / 1000).toFixed(2));

  // ==========================================
  // STEP 5 : Plan Calculator
  // ==========================================

  let premiumResult;

  switch (product.planNumber) {
    case "714":
    case "715":
    case "733":
    case "751":
    case "760":
      premiumResult = await calculateLIC714({
        productId: data.productId,
        premiumMode: data.premiumMode,
        age: data.age,
        policyTerm,
        sumAssured: data.sumAssured,
        tabularPremium,
        rate,
      });
      break;

    case "717":
      premiumResult = await calculateLIC717({
        productId: data.productId,
        premiumMode: data.premiumMode,
        age: data.age,
        policyTerm,
        sumAssured: data.sumAssured,
        tabularPremium,
        rate,
      });
      break;

    case "748":
      premiumResult = await calculateLIC748({
        productId: data.productId,
        premiumMode: data.premiumMode,
        age: data.age,
        policyTerm,
        sumAssured: data.sumAssured,
        tabularPremium,
        rate,
      });
      break;

    case "771":
      premiumResult = await calculateLIC771({
        productId: data.productId,
        premiumMode: data.premiumMode,
        age: data.age,
        policyTerm, // Actual Policy Term (100-age)
        premiumPayingTerm: validatedPPT,
        sumAssured: data.sumAssured,
        tabularPremium,
        rate,
      });
      break;

    case "745":
      premiumResult = await calculateLIC745({
        productId: data.productId,
        premiumMode: data.premiumMode,
        age: data.age,
        policyTerm,
        premiumPayingTerm: validatedPPT,
        sumAssured: data.sumAssured,
        tabularPremium,
        rate,
      });
      break;

    case "883":
      premiumResult = await calculateLIC883({
        productId: data.productId,
        premiumMode: data.premiumMode,
        age: data.age,
        policyTerm,
        premiumPayingTerm: validatedPPT,
        sumAssured: data.sumAssured,
        tabularPremium,
        rate,
      });
      break;

    case "736":
      premiumResult = await calculateLIC736({
        productId: data.productId,
        premiumMode: data.premiumMode,
        age: data.age,
        policyTerm,
        sumAssured: data.sumAssured,
        tabularPremium,
        rate,
      });

    case "720":
    case "721":
      premiumResult = await calculateLIC720({
        productId: data.productId,
        premiumMode: data.premiumMode,
        age: data.age,
        policyTerm,
        sumAssured: data.sumAssured,
        tabularPremium,
        rate,
      });
      break;

    case "888":
      premiumResult = await calculateLIC888({
        productId: data.productId,
        premiumMode: data.premiumMode,
        age: data.age,
        secondaryAge: data.secondaryAge!,
        policyTerm,
        option: option!,
        sumAssured: data.sumAssured,
        tabularPremium,
        rate,
      });
      break;

    case "889":
      premiumResult = await calculateLIC889({
        productId: data.productId,
        premiumMode: data.premiumMode,
        age: data.age,
        secondaryAge: data.secondaryAge!,
        policyTerm,
        premiumPayingTerm: premiumPayingTerm!,
        option: option!,
        sumAssured: data.sumAssured,
        tabularPremium,
        rate,
      });
      break;

    case "774":
      premiumResult = await calculateLIC774({
        productId: data.productId,
        premiumMode: data.premiumMode,
        age: data.age,
        premiumPayingTerm: premiumPayingTerm!,
        policyTerm,
        option: option!,
        sumAssured: data.sumAssured,
        tabularPremium,
        rate,
      });
      break;

    case "887":
      premiumResult = await calculateLIC887({
        productId: data.productId,
        premiumMode: data.premiumMode,
        age: data.age,
        policyTerm,
        premiumPayingTerm: premiumPayingTerm!,
        option: option!,
        gender: data.gender!,
        smoker: data.smoker!,
        sumAssured: data.sumAssured,
        tabularPremium,
        rate,
      });
      break;

    default: {
      const saRebate = await rebateService.calculateSumAssuredRebate(
        data.productId,
        data.sumAssured,
        tabularPremium,
      );

      premiumResult = {
        saRebateRate: saRebate.rebateRate,
        saRebateAmount: saRebate.rebateAmount,
        modeRebateRate: 0,
        modeRebateAmount: 0,
        basicYearlyPremium: saRebate.basicPremium,
      };

      break;
    }
  }

  // ==========================================
  // STEP 6 : Mode Factor
  // ==========================================

  const modeFactor = await getModeFactor(data.productId, data.premiumMode);

  const installmentPremium = Number(
    (premiumResult.basicYearlyPremium * modeFactor).toFixed(2),
  );

  // ==========================================
  // STEP 7 : Return
  // ==========================================

  return {
    rate,

    tabularPremium,

    saRebateRate: premiumResult.saRebateRate,
    saRebateAmount: premiumResult.saRebateAmount,

    modeRebateRate: premiumResult.modeRebateRate,
    modeRebateAmount: premiumResult.modeRebateAmount,

    basicYearlyPremium: premiumResult.basicYearlyPremium,

    modeFactor,

    installmentPremium,

    gst: 0,
  };
}
