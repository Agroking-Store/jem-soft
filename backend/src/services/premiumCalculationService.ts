import { prisma } from "../config/database.js";
import { AppError } from "../utils/AppError.js";
import { licAgeBand, licNearestAge } from "../utils/licAgeBand.js";
import rebateService from "./rebateService.js";

import { calculateLIC714 } from "./premiumcalculators/lic714Calculator.js";
import { calculateLIC904 } from "./premiumcalculators/lic904Calculator.js";
import { calculateLIC903 } from "./premiumcalculators/lic903Calculator.js";
import { calculateLIC915 } from "./premiumcalculators/lic915Calculator.js";
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
import { calculateLIC894, validateLIC894Eligibility } from "./premiumcalculators/lic894Calculator.js";
import { calculateLIC890, validateLIC890Eligibility } from "./premiumcalculators/lic890Calculator.js";
import { calculateLIC855, validateLIC855Eligibility } from "./premiumcalculators/lic855Calculator.js";
import { calculateLIC856, validateLIC856Eligibility } from "./premiumcalculators/lic856Calculator.js";

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
  /**
   * Customer's date of birth and the policy's commencement date. Together they
   * determine LIC's half-year age band. Both optional - without them the lookups
   * fall back to integer entry age.
   */
  dateOfBirth?: string | null;
  commencementDate?: string | null;
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

interface PremiumResult {
  saRebateRate: number;
  saRebateAmount: number;
  modeRebateRate: number;
  modeRebateAmount: number;
  basicYearlyPremium: number;
  /** Exact installment for calculators that divide by the mode divisor. */
  installmentOverride?: number;
  /** 915 keeps paise on the yearly premium; every other plan rounds GST. */
  gstRounding?: "PAISE" | "WHOLE";
  /** 904's table rate is an IDB-1,000 premium, not a per-1,000 rate. */
  tabularPremiumOverride?: number;
  /** 904 rounds the total premium, so the GST is the remainder. */
  gstAmountOverride?: number;
  totalOverride?: number;
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

  if (
    product.planNumber &&
    ["717", "888", "883", "917", "866"].includes(product.planNumber)
  ) {
    data.premiumMode = "Single";
  }

  // Plan 855 also offers a single-premium option, but only when the selected
  // PPT is 1. Regular and limited premiums stay on the Yearly/Half-Yearly path.
  if (product.planNumber === "855" && premiumPayingTerm === 1) {
    data.premiumMode = "Single";
  }

  // GST is a product-level fact (plan 917 charges 4.5% on a single premium;
  // the older legacy plans predate GST and carry no GST_RATE attribute).
  // Keeping it in the attribute table rather than in code means adding a
  // GST-bearing plan never touches another plan's premium.
  const gstAttribute = await prisma.productAttributeValue.findFirst({
    where: {
      productId: data.productId,
      attribute: { attributeCode: "GST_RATE" },
    },
    select: { value: true },
  });
  const gstRate = gstAttribute ? Number(gstAttribute.value) : 0;

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

  // LIC legacy plans are rated on a half-year age band derived from the date of
  // birth and the commencement date. Null for every other plan, and null when
  // the caller did not supply a date of birth - the lookups below then use
  // integer entry age exactly as before.
  const ageBand = licAgeBand(data.dateOfBirth, data.commencementDate);
  // ==========================================
  // STEP 3 : Premium Rate
  // ==========================================

  let premiumRate;

  if (product.planNumber === "866") {
    if (option == null) {
      throw new AppError("Option is required for LIC Plan 866", 400);
    }
    // Dhan Varsha is priced on the nearer birthday, not the completed age:
    // 7y6m pays the age-8 rate and 7y5m pays the age-7 rate. The rate grid
    // therefore stores one row per nearest-birthday age (ageBand null).
    const nearestAge =
      licNearestAge(data.dateOfBirth, data.commencementDate) ?? age;
    premiumRate = await prisma.productPremiumRate.findFirst({
      where: {
        productId: data.productId,
        entryAge: nearestAge,
        policyTerm,
        premiumPayingTerm: 1,
        option,
        ageBand: null,
      },
    });
  } else if (product.planNumber === "874") {
    // Amritbaal rates are keyed by entry age, term, PPT and LIC's Sum Assured
    // Option (SBOption 1/2). This plan-specific branch leaves other legacy
    // plan lookups unchanged.
    if (option == null) {
      throw new AppError("Option is required for LIC Plan 874", 400);
    }
    if (premiumPayingTerm == null) {
      throw new AppError("Premium Paying Term is required for LIC Plan 874", 400);
    }

    const rateKey = {
      productId: data.productId,
      policyTerm,
      premiumPayingTerm,
      option,
    };
    if (ageBand != null) {
      premiumRate = await prisma.productPremiumRate.findFirst({
        where: { ...rateKey, ageBand },
      });
    }
    if (!premiumRate) {
      premiumRate = await prisma.productPremiumRate.findFirst({
        where: { ...rateKey, ageBand: null, entryAge: age },
      });
    }
  } else if (product.planNumber === "855") {
    // Jeevan Amar is rated on last-birthday age, term, PPT, death-benefit
    // option, gender and smoking status. Unlike the half-year-band legacy
    // plans, its table is whole-year, so ageBand is deliberately null.
    if (activeGender == null || String(activeGender).trim() === "") {
      throw new AppError("Gender is required for LIC Plan 855", 400);
    }

    const genderKey =
      activeGender === "F" ||
      activeGender === "Female" ||
      activeGender === "FEMALE"
        ? "F"
        : "M";
    const smokerKey = activeSmoker === true;

    const eligibility = validateLIC855Eligibility({
      premiumMode: data.premiumMode,
      age,
      policyTerm,
      premiumPayingTerm,
      sumAssured,
      option,
    });

    premiumRate = await prisma.productPremiumRate.findFirst({
      where: {
        productId: data.productId,
        entryAge: age,
        ageBand: null,
        gender: genderKey,
        smoker: smokerKey,
        policyTerm,
        premiumPayingTerm: eligibility.ppt,
        option: eligibility.option,
      },
    });

    if (!premiumRate) {
      throw new AppError(
        `Premium rate not found for LIC Plan 855: Age ${age}, Gender ${genderKey}, ` +
          `${smokerKey ? "Smoker" : "Non-Smoker"}, Term ${policyTerm}, ` +
          `PPT ${eligibility.ppt}, Option ${eligibility.option}`,
        404,
      );
    }
  } else if (product.planNumber === "856") {
    // PMVVY is a single-premium purchase-price plan. The engine stores a zero
    // rate and returns the sum assured; eligibility is mode-specific because
    // the minimum/maximum purchase price changes with the pension mode.
    validateLIC856Eligibility({
      premiumMode: data.premiumMode,
      age,
      policyTerm,
      premiumPayingTerm,
      sumAssured,
    });

    premiumRate = await prisma.productPremiumRate.findFirst({
      where: {
        productId: data.productId,
        entryAge: age,
        ageBand: null,
        policyTerm,
        premiumPayingTerm: 1,
        option: null,
        gender: null,
        smoker: null,
      },
    });

    if (!premiumRate) {
      throw new AppError(
        `Premium rate not found for LIC Plan 856: Age ${age}, Term ${policyTerm}`,
        404,
      );
    }
  } else if (product.planNumber === "888") {
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
  } else if (product.planNumber === "894") {
    // Jeevan Raksha prices on age, gender, smoking status, policy term and
    // premium paying term (brochure sec.5) and publishes 16 separate rate
    // tables, so a row for another gender or smoking status is a different
    // price - never a fallback. Gender and smoker are both sent by the form;
    // a missing smoker means the form's Non-Smoker default.
    if (activeGender == null || String(activeGender).trim() === "") {
      throw new AppError("Gender is required for LIC Plan 894", 400);
    }

    const genderKey =
      activeGender === "F" ||
      activeGender === "Female" ||
      activeGender === "FEMALE"
        ? "F"
        : "M";
    const smokerKey = activeSmoker === true;

    // LIC's eligibility rules (age, term, PPT, sum assured, mode) run before
    // the lookup, so an impossible quote is rejected with a reason rather than
    // falling through to the manual-premium path reserved for missing rates.
    const { ppt: pptVal } = validateLIC894Eligibility({
      premiumMode: data.premiumMode,
      age,
      policyTerm,
      premiumPayingTerm,
      sumAssured,
    });

    premiumRate = await prisma.productPremiumRate.findFirst({
      where: {
        productId: data.productId,
        entryAge: age,
        gender: genderKey,
        smoker: smokerKey,
        policyTerm,
        premiumPayingTerm: pptVal,
      },
    });

    if (!premiumRate) {
      throw new AppError(
        `Premium rate not found for LIC Plan 894: Age ${age}, Gender ${genderKey}, ` +
          `${smokerKey ? "Smoker" : "Non-Smoker"}, Term ${policyTerm}, PPT ${pptVal}`,
        404,
      );
    }
  } else if (product.planNumber === "890") {
    // New Bima Jyoti is priced on entry age and policy term only; the premium
    // paying term is fixed at policy term minus 5 and the rate is the same for
    // every sum assured, gender and smoking status (brochure sec.2 g, sec.9).
    // Eligibility runs first so an impossible quote is rejected with the rule
    // it broke instead of becoming a "manual premium".
    const { ppt } = validateLIC890Eligibility({
      premiumMode: data.premiumMode,
      age,
      policyTerm,
      premiumPayingTerm,
      sumAssured,
    });

    premiumRate = await prisma.productPremiumRate.findFirst({
      where: {
        productId: data.productId,
        entryAge: age,
        ageBand: null,
        policyTerm,
        premiumPayingTerm: ppt,
        gender: null,
        smoker: null,
      },
    });

    if (!premiumRate) {
      throw new AppError(
        `Premium rate not found for LIC Plan 890: Age ${age}, Term ${policyTerm}, PPT ${ppt}`,
        404,
      );
    }
  } else if (product.planNumber === "901" || product.planNumber === "902") {
    // LIC Health Plus (901) and Health Protection Plus (902) are ULIP health plans with no tabular rates.
    throw new AppError(
      `Plan ${product.planNumber} is a Unit-Linked Health Plan. Premium is customer-chosen (min Rs 5,000 p.a.) — manual entry applies.`,
      404,
    );
  } else if (product.planNumber === "903") {
    // Plan 903's rate table is keyed by last-birthday age, gender, and member
    // role. Its tabular rate is an annual premium per Rs 1,000 HCB, independent
    // of policy term; the published table has no half-year age bands.
    if (age >= 18 && activeGender == null) {
      throw new AppError("Gender is required for LIC Plan 903", 400);
    }

    const insuredType = age < 18 ? 2 : option === 2 ? 2 : 1;
    premiumRate = await prisma.productPremiumRate.findFirst({
      where: {
        productId: data.productId,
        entryAge: age,
        gender: activeGender ?? "M",
        option: insuredType,
        policyTerm,
        premiumPayingTerm: premiumPayingTerm ?? policyTerm,
      },
    });
  } else if (product.planNumber === "904") {
    // Jeevan Arogya is a health plan. Its table is keyed on age, gender and
    // whether the life is the principal insured (option 1) or any other
    // insured (option 2). It does not vary by policy term.
    if (age >= 18 && activeGender == null) {
      throw new AppError("Gender is required for LIC Plan 904", 400);
    }

    const insuredType = age < 18 ? 2 : option === 2 ? 2 : 1;
    premiumRate = await prisma.productPremiumRate.findFirst({
      where: {
        productId: data.productId,
        entryAge: age,
        gender: activeGender ?? "M",
        option: insuredType,
      },
    });
  } else {
    // ------------------------------------------
    // EXISTING PLANS
    // ------------------------------------------

    const premiumPayingTermFilter =
      premiumPayingTerm == null ? undefined : premiumPayingTerm;

    // LIC legacy plans store one rate per half-year age band. When the caller
    // knows the customer's date of birth and the policy's commencement date we
    // can reproduce LIC's band exactly, so prefer that row; otherwise fall back
    // to the integer entry age row.
    if (ageBand != null) {
      premiumRate = await prisma.productPremiumRate.findFirst({
        where: {
          productId: data.productId,
          ageBand,
          policyTerm: lookupTerm,
          premiumPayingTerm: premiumPayingTermFilter,
        },
      });

      if (!premiumRate) {
        premiumRate = await prisma.productPremiumRate.findFirst({
          where: {
            productId: data.productId,
            ageBand,
            policyTerm: lookupTerm,
            premiumPayingTerm: undefined,
          },
        });
      }
    }

    if (!premiumRate) {
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

  const tabularPremium = Number(
    (product.planNumber === "903"
      ? (rate * data.sumAssured) / 100000
      : (rate * data.sumAssured) / 1000
    ).toFixed(2),
  );

  // ==========================================
  // STEP 5 : Plan Calculator
  // ==========================================

  let premiumResult: PremiumResult;

  switch (product.planNumber) {
    case "903":
      premiumResult = await calculateLIC903({
        premiumMode: data.premiumMode,
        age: data.age,
        sumAssured: data.sumAssured,
        tabularPremium,
        rate,
        option,
      });
      break;

    case "915":
      premiumResult = await calculateLIC915({
        productId: data.productId,
        premiumMode: data.premiumMode,
        age: data.age,
        policyTerm,
        sumAssured: data.sumAssured,
        tabularPremium,
        rate,
      });
      break;

    case "894":
      premiumResult = await calculateLIC894({
        productId: data.productId,
        premiumMode: data.premiumMode,
        age: data.age,
        policyTerm,
        premiumPayingTerm:
          premiumPayingTerm ??
          (data.premiumMode === "Single" ||
          data.premiumMode === "O" ||
          data.premiumMode === "S"
            ? 1
            : policyTerm),
        sumAssured: data.sumAssured,
        tabularPremium,
        rate,
      });
      break;

    case "890":
      premiumResult = await calculateLIC890({
        productId: data.productId,
        premiumMode: data.premiumMode,
        age: data.age,
        policyTerm,
        premiumPayingTerm: premiumPayingTerm ?? policyTerm - 5,
        sumAssured: data.sumAssured,
        tabularPremium,
        rate,
      });
      break;

    case "855":
      premiumResult = await calculateLIC855({
        productId: data.productId,
        premiumMode: data.premiumMode,
        age: data.age,
        policyTerm,
        premiumPayingTerm,
        sumAssured: data.sumAssured,
        tabularPremium,
        rate,
        option,
      });
      break;

    case "856":
      premiumResult = await calculateLIC856({
        productId: data.productId,
        premiumMode: data.premiumMode,
        age: data.age,
        policyTerm,
        premiumPayingTerm,
        sumAssured: data.sumAssured,
        tabularPremium,
        rate,
      });
      break;

    case "904":
      premiumResult = await calculateLIC904({
        productId: data.productId,
        premiumMode: data.premiumMode,
        age: data.age,
        policyTerm,
        sumAssured: data.sumAssured,
        tabularPremium,
        rate,
        option,
      });
      break;

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
      // Legacy plans have no dedicated calculator. LIC's rebate for those
      // varies with entry age and policy term, so prefer the age/term aware
      // table and let it fall back to the classic sum-assured one.
      const saRebate = await rebateService.calculateAgeTermRebate(
        data.productId,
        age,
        lookupTerm,
        data.sumAssured,
        tabularPremium,
        ageBand,
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

  // A calculator that has already divided by the mode divisor hands back the
  // exact installment; the generic factor path stays for every other plan.
  const installmentPremium = Number(
    (
      premiumResult.installmentOverride ??
      premiumResult.basicYearlyPremium * modeFactor
    ).toFixed(2),
  );

  // LIC rounds the tax to whole rupees on the premium it actually collects, so
  // a 4.5% GST on 7,50,740 is 33,783 and not 33,783.30. Plan 915's yearly
  // premium is the exception - LIC keeps the paise there.
  const gst =
    premiumResult.gstAmountOverride ??
    (gstRate > 0
      ? premiumResult.gstRounding === "PAISE"
        ? Number(((installmentPremium * gstRate) / 100).toFixed(2))
        : Math.round((installmentPremium * gstRate) / 100)
      : 0);

  // ==========================================
  // STEP 7 : Return
  // ==========================================

  return {
    rate,

    tabularPremium: premiumResult.tabularPremiumOverride ?? tabularPremium,

    saRebateRate: premiumResult.saRebateRate,
    saRebateAmount: premiumResult.saRebateAmount,

    modeRebateRate: premiumResult.modeRebateRate,
    modeRebateAmount: premiumResult.modeRebateAmount,

    basicYearlyPremium: premiumResult.basicYearlyPremium,

    modeFactor,

    installmentPremium,

    gstRate,

    gstRounding: premiumResult.gstRounding,

    gst,

    gstAmountOverride: premiumResult.gstAmountOverride,

    totalOverride: premiumResult.totalOverride,

    totalInstallmentPremium:
      premiumResult.totalOverride ??
      Number((installmentPremium + gst).toFixed(2)),
  };
}
