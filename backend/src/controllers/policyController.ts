import { Request, Response } from "express";
import { Gender } from "@prisma/client";
import { catchAsync } from "../utils/catchAsync.js";
import * as policyService from "../services/policyService.js";
import { calculatePremium } from "../services/premiumCalculationService.js";
import { AppError } from "../utils/AppError.js";
import { licAgeBand } from "../utils/licAgeBand.js";

export const createPolicy = catchAsync(
  async (req: Request, res: Response) => {
    const newPolicy = await policyService.createPolicy(req.body);

    res.status(201).json({
      status: "success",
      data: {
        policy: newPolicy,
      },
    });
  },
);

export const previewPremium = catchAsync(
  async (req: Request, res: Response) => {
    const {
      productId,
      age,
      secondaryAge,
      option,
      policyTerm,
      premiumPayingTerm,
      sumAssured,
      premiumMode,
      gender,
      smoker,
      // LIC legacy plans are rated on a half-year age band. When the caller
      // sends the customer's date of birth and the policy's commencement date we
      // can reproduce LIC's band exactly instead of guessing from integer age.
      dateOfBirth,
      commencementDate,
    } = req.body;

    if (!productId || !age || !policyTerm || !sumAssured || !premiumMode) {
      throw new AppError(
        "Product, age, term, sum assured, and mode are required.",
        400,
      );
    }

    const { prisma } = await import("../config/database.js");
    const product = await prisma.productMaster.findUnique({
      where: { id: productId },
      select: {
        provider: {
          select: {
            code: true,
          },
        },
      },
    });

    if (product?.provider?.code?.toUpperCase() !== "LIC") {
      res.status(200).json({
        status: "success",
        data: {
          premium: null,
          message: "Manual calculation applies for non-LIC plans.",
        },
      });
      return;
    }

    try {
      const premium = await calculatePremium({
        productId,
        age: Number(age),
        secondaryAge:
          secondaryAge !== undefined &&
            secondaryAge !== null &&
            secondaryAge !== ""
            ? Number(secondaryAge)
            : null,
        option:
          option !== undefined &&
            option !== null &&
            option !== ""
            ? Number(option)
            : null,
        policyTerm: Number(policyTerm),
        premiumPayingTerm:
          premiumPayingTerm !== undefined &&
            premiumPayingTerm !== null &&
            premiumPayingTerm !== ""
            ? Number(premiumPayingTerm)
            : null,
        sumAssured: Number(sumAssured),
        premiumMode,
        gender,
        dateOfBirth: dateOfBirth || null,
        commencementDate: commencementDate || null,
        smoker,
      });

      res.status(200).json({
        status: "success",
        data: {
          premium,
        },
      });
    } catch (err: any) {
      if (err.statusCode === 404 || err.message?.toLowerCase().includes("not found")) {
        res.status(200).json({
          status: "success",
          data: {
            premium: null,
            isManual: true,
            message: err.message || "Premium rate not found in database. Manual entry applies.",
          },
        });
        return;
      }
      throw err;
    }
  },
);

export const previewRiderPremium = catchAsync(
  async (req: Request, res: Response) => {
    const {
      riderId,
      age,
      riderTerm,
      premiumPayingTerm,
      sumAssured,
      premiumMode,
      productId,
      option,
      gender,
      // Rider rates move on the same half-year age band as the base rate.
      dateOfBirth,
      commencementDate,
    } = req.body;

    if (
      !riderId ||
      !age ||
      !riderTerm ||
      !sumAssured ||
      !premiumMode ||
      !productId
    ) {
      throw new AppError(
        "Rider ID, age, rider term, sum assured, product ID, and premium mode are required.",
        400,
      );
    }

    const { prisma } = await import("../config/database.js");
    const initialProduct = await prisma.productMaster.findUnique({
      where: { id: productId },
      select: {
        provider: {
          select: {
            code: true,
          },
        },
      },
    });

    if (initialProduct?.provider?.code?.toUpperCase() !== "LIC") {
      res.status(200).json({
        status: "success",
        data: {
          premium: 0,
          rate: null,
          message: "Manual calculation applies for non-LIC plans.",
        },
      });
      return;
    }

    const { getModeFactor } = await import(
      "../services/premiumCalculationService.js"
    );

    // =========================================================
    // NORMALIZE GENDER
    // =========================================================
    // Frontend may send:
    // "Male", "male", "MALE"
    // "Female", "female", "FEMALE"
    //
    // Prisma enum accepts only:
    // Gender.MALE
    // Gender.FEMALE
    //
    // If no gender is supplied, we use null because
    // not all riders are gender-specific.
    // =========================================================

    let normalizedGender: Gender | null = null;

    if (gender !== undefined && gender !== null && gender !== "") {
      const genderValue = String(gender).trim().toUpperCase();

      if (genderValue === "MALE") {
        normalizedGender = Gender.MALE;
      } else if (genderValue === "FEMALE") {
        normalizedGender = Gender.FEMALE;
      } else {
        throw new AppError(
          `Invalid gender '${gender}'. Expected Male or Female.`,
          400,
        );
      }
    }

    // =========================================================
    // FIND PRODUCT
    // =========================================================

    const product = await prisma.productMaster.findUnique({
      where: {
        id: productId,
      },
    });

    if (!product) {
      throw new AppError(
        `Product with ID ${productId} not found.`,
        404,
      );
    }

    // =========================================================
    // BUILD BASE WHERE CLAUSE
    // =========================================================

    const whereClause: any = {
      riderId,
      productId,
      entryAge: Number(age),
      riderTerm: Number(riderTerm),
    };

    if (
      option !== undefined &&
      option !== null &&
      option !== ""
    ) {
      whereClause.option = Number(option);
    }

    // =========================================================
    // PLANS THAT USE PPT FOR RIDER RATES
    // =========================================================

    const rider = await prisma.riderMaster.findUnique({
      where: { id: riderId },
      select: { riderCode: true },
    });

    const usesRiderPPT = [
      "771",
      "745",
      "883",
      "887",
      "881",
      "889",
      "912"
    ].includes(product.planNumber || "") ||
      (product.productCode?.startsWith("LEGACY-") ?? false) ||
      (product.planNumber === "736" && rider?.riderCode === "ADDB");

    let riderRate = null;

    // =========================================================
    // BUILD QUERIES TO TRY (ORDERED BY SPECIFICITY)
    // =========================================================
    
    const queriesToTry = [];

    let queryPPT: number | null = null;
    
    if (usesRiderPPT) {
      if (product.planNumber === "883") {
        // Plan 883 Term Rider always has PPT 1, and riderTerm comes from DB
        queryPPT = 1;
        delete whereClause.riderTerm;
      } else if (
        premiumPayingTerm !== undefined &&
        premiumPayingTerm !== null &&
        premiumPayingTerm !== ""
      ) {
        queryPPT = Number(premiumPayingTerm);
      }
    }

    if (queryPPT !== null) {
      if (normalizedGender) {
        queriesToTry.push({ ...whereClause, gender: normalizedGender, premiumPayingTerm: queryPPT });
      }
      queriesToTry.push({ ...whereClause, gender: null, premiumPayingTerm: queryPPT });
      if (normalizedGender) {
        queriesToTry.push({ ...whereClause, gender: normalizedGender, premiumPayingTerm: null });
      }
      queriesToTry.push({ ...whereClause, gender: null, premiumPayingTerm: null });
    } else {
      if (normalizedGender) {
        queriesToTry.push({ ...whereClause, gender: normalizedGender, premiumPayingTerm: null });
      }
      queriesToTry.push({ ...whereClause, gender: null, premiumPayingTerm: null });
    }

    // =========================================================
    // EXECUTE QUERIES
    // =========================================================

    // LIC legacy rider rates are quoted on a half-year age band. When we know
    // the customer's date of birth and the commencement date, try the band
    // rows first - plan 833's Term Rider Benefit differs by 9.5% between the
    // two halves of an age year - then fall back to the whole-age rows.
    const riderAgeBand = licAgeBand(dateOfBirth, commencementDate);

    if (riderAgeBand != null) {
      for (const query of queriesToTry) {
        riderRate = await prisma.riderPremiumRate.findFirst({
          where: { ...query, entryAge: undefined, ageBand: riderAgeBand },
        });
        if (riderRate) break;
      }
      if (!riderRate) {
        for (const query of queriesToTry) {
          riderRate = await prisma.riderPremiumRate.findFirst({
            where: { ...query, entryAge: undefined, ageBand: riderAgeBand },
          });
          if (riderRate) break;
        }
      }
    }

    if (!riderRate) {
      for (const query of queriesToTry) {
        riderRate = await prisma.riderPremiumRate.findFirst({
          where: query,
        });
        if (riderRate) break;
      }
    }

    // =========================================================
    // FALLBACK FOR AGE-INDEPENDENT RIDER RATES (entryAge: 0)
    // (e.g., ADDB rider rates where rates do not vary by age)
    // =========================================================
    if (!riderRate) {
      for (const query of queriesToTry) {
        riderRate = await prisma.riderPremiumRate.findFirst({
          where: { ...query, entryAge: 0 },
        });
        if (riderRate) break;
      }
    }

    // =========================================================
    // RATE NOT FOUND
    // =========================================================

    if (!riderRate) {
      res.status(200).json({
        status: "success",
        data: {
          premium: 0,
          rate: null,
          isManual: true,
          message: "Rider premium rate not found in database. Manual entry applies.",
        },
      });
      return;
    }

    // =========================================================
    // CALCULATE PREMIUM
    // =========================================================

    const tabularPremium =
      (Number(riderRate.ratePerThousand) * Number(sumAssured)) /
      1000;

    // DAB/ADDB/ABR are flat per-1000 benefits. LIC divides them by exactly
    // 2/4/12 for half-yearly/quarterly/monthly; only the mortality riders
    // (TRB/CIR) carry the ~1% loading in the product mode factor. Using the
    // product factor here would overcharge a 10 lakh DAB by 5 rupees.
    //
    // Plan 890 is the exception on the other side: LIC's rider lookup returns
    // its mortality riders without that loading too (TRB annual 6,360.20 is
    // quoted as 3,180.10 half-yearly, 1,589.56 quarterly and 530.18 monthly),
    // so every rider of that plan is divided flat.
    const FLAT_MODE_RIDERS = new Set(["DAB", "ADDB", "ABR"]);
    const FLAT_MODE_RIDER_PLANS = new Set(["890"]);
    const modeName = String(premiumMode ?? "").trim().toLowerCase();
    const flatModeFactor = modeName.startsWith("half")
      ? 0.5
      : modeName.startsWith("quarter")
        ? 0.25
        : modeName.startsWith("month")
          ? 1 / 12
          : 1;

    const modeFactor =
      rider &&
      (FLAT_MODE_RIDERS.has(rider.riderCode) ||
        FLAT_MODE_RIDER_PLANS.has(product.planNumber ?? ""))
        ? flatModeFactor
        : await getModeFactor(productId, premiumMode);

    // The Critical Illness riders are the one exception: LIC prices them with
    // the classic rider loading of 1% half-yearly and 2% quarterly/monthly, so
    // plan 890 quotes a 6,380 yearly CIR as 3,222 / 1,627 / 542.
    const isCriticalIllness =
      rider != null && (rider.riderCode === "CIR" || rider.riderCode === "CIR2");
    const cirModeFactor = modeName.startsWith("half")
      ? 0.505
      : modeName.startsWith("quarter")
        ? 0.255
        : modeName.startsWith("month")
          ? 0.085
          : 1;
    const effectiveModeFactor =
      isCriticalIllness && product.planNumber === "890"
        ? cirModeFactor
        : modeFactor;

    const installmentPremium = Number(
      (tabularPremium * effectiveModeFactor).toFixed(2),
    );

    // =========================================================
    // RESPONSE
    // =========================================================

    res.status(200).json({
      status: "success",
      data: {
        premium: installmentPremium,
        rate: Number(riderRate.ratePerThousand),
        gender: riderRate.gender,
        riderTerm: riderRate.riderTerm,
        premiumPayingTerm: riderRate.premiumPayingTerm,
      },
    });
  },
);

export const getAllPolicies = catchAsync(
  async (req: Request, res: Response) => {
    const {
      search,
      holderName,
      policyNumber,
      planName,
      groupCode,
      premium,
      dueDate,
      sumAssured,
      status,
      policyAge,
      sortBy,
      sortOrder,
      page,
      limit,
    } = req.query;

    const policies = await policyService.getAllPolicies({
      search: typeof search === "string" ? search : undefined,
      holderName:
        typeof holderName === "string" ? holderName : undefined,
      policyNumber:
        typeof policyNumber === "string"
          ? policyNumber
          : undefined,
      planName:
        typeof planName === "string" ? planName : undefined,
      groupCode:
        typeof groupCode === "string" ? groupCode : undefined,
      premium:
        typeof premium === "string" ? premium : undefined,
      dueDate:
        typeof dueDate === "string" ? dueDate : undefined,
      sumAssured:
        typeof sumAssured === "string"
          ? sumAssured
          : undefined,
      status:
        typeof status === "string" ? status : undefined,
      policyAge:
        typeof policyAge === "string" ? policyAge : undefined,
      sortBy:
        typeof sortBy === "string" ? sortBy : undefined,
      sortOrder:
        typeof sortOrder === "string" ? (sortOrder as "asc" | "desc") : undefined,
    });

    const hasPagination =
      page !== undefined || limit !== undefined;

    const pageNumber = Math.max(Number(page) || 1, 1);

    const limitNumber = Math.max(
      Number(limit) || policies.length || 1,
      1,
    );

    const paginatedPolicies = hasPagination
      ? policies.slice(
        (pageNumber - 1) * limitNumber,
        pageNumber * limitNumber,
      )
      : policies;

    res.status(200).json({
      status: "success",
      results: paginatedPolicies.length,
      data: {
        policies: paginatedPolicies,
      },
    });
  },
);

export const deletePolicy = catchAsync(
  async (req: Request, res: Response) => {
    await policyService.deletePolicy(req.params.id);

    res.status(204).json({
      status: "success",
      data: null,
    });
  },
);

export const getPolicyById = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const policy = await policyService.getPolicyById(id);

    res.status(200).json({
      status: "success",
      data: {
        policy,
      },
    });
  },
);

export const getPoliciesByMember = catchAsync(
  async (req: Request, res: Response) => {
    const { memberId } = req.params;

    const policies =
      await policyService.getPoliciesByMember(memberId);

    res.status(200).json({
      status: "success",
      results: policies.length,
      data: {
        policies,
      },
    });
  },
);

export const updatePolicy = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    console.log(
      "updatePolicy controller - req.params.id:",
      id,
    );

    console.log(
      "updatePolicy controller - req.body:",
      req.body,
    );

    const updatedPolicy =
      await policyService.updatePolicy(id, req.body);

    const refreshedPolicy =
      await policyService.getPolicyById(updatedPolicy.id);

    res.status(200).json({
      status: "success",
      data: {
        policy: refreshedPolicy,
      },
    });
  },
);
