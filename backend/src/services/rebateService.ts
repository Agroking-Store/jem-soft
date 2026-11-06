import { prisma } from "../config/database.js";

class RebateService {
  /**
   * Age-and-term aware rebate, used by the legacy plans.
   *
   * LIC's rebate depends on entry age AND policy term AND sum assured. This
   * looks for the most specific row first (exact age + term), then relaxes the
   * term, then the age. Falls back to the sum-assured-only table so the
   * 7-series calculators keep behaving exactly as before.
   */
  async calculateAgeTermRebate(
    productId: string,
    entryAge: number | null | undefined,
    policyTerm: number | null | undefined,
    sumAssured: number,
    tabularPremium: number,
    ageBand: number | null = null
  ) {
    if (entryAge === null || entryAge === undefined) {
      return this.calculateSumAssuredRebate(productId, sumAssured, tabularPremium);
    }

    const saFilter = {
      minSumAssured: { lte: sumAssured },
      OR: [{ maxSumAssured: null }, { maxSumAssured: { gte: sumAssured } }],
    };

    // Most specific first: exact half-year band, then the age row that covers a
    // whole year, then the classic sum-assured-only table.
    //
    // Every attempt is scoped to the product. Without that filter a plan whose
    // (entry age, term, band) happens to coincide with another legacy plan's
    // row picks up the other plan's rebate: plan 917 shares terms 13-25 with
    // plan 833, and was silently charged 1.656 per 1000 instead of 18.
    const attempts: Record<string, unknown>[] = [];
    if (ageBand != null) attempts.push({ productId, entryAge, policyTerm: policyTerm ?? undefined, ageBand, ...saFilter });
    attempts.push({ productId, entryAge, policyTerm: policyTerm ?? undefined, ageBand: null, ...saFilter });
    attempts.push({ productId, entryAge, policyTerm: null, ageBand: null, ...saFilter });

    for (const where of attempts) {
      const rule = await prisma.productAgeTermRebate.findFirst({ where: where as any });
      if (!rule) continue;

      const rebateRate = Number(rule.rebatePerThousand);
      const rebateAmount = Number(((sumAssured / 1000) * rebateRate).toFixed(2));
      return {
        rebateRate,
        rebateAmount,
        basicPremium: Number((tabularPremium - rebateAmount).toFixed(2)),
      };
    }

    // No age/term rows for this product - use the classic sum-assured table.
    return this.calculateSumAssuredRebate(productId, sumAssured, tabularPremium);
  }

  async calculateSumAssuredRebate(
    productId: string,
    sumAssured: number,
    tabularPremium: number
  ) {
    const rebateRule = await prisma.productSumAssuredRebate.findFirst({
      where: {
        productId,
        minSumAssured: {
          lte: sumAssured,
        },
        OR: [
          {
            maxSumAssured: null,
          },
          {
            maxSumAssured: {
              gte: sumAssured,
            },
          },
        ],
      },
      orderBy: {
        minSumAssured: "desc",
      },
    });

    // No rebate slab found
    if (!rebateRule) {
      return {
        rebateRate: 0,
        rebateAmount: 0,
        basicPremium: tabularPremium,
      };
    }

    const rebateRate = Number(rebateRule.rebatePerThousand);

    const rebateAmount = Number(
      ((sumAssured / 1000) * rebateRate).toFixed(2)
    );

    const basicPremium = Number(
      (tabularPremium - rebateAmount).toFixed(2)
    );

    return {
      rebateRate,
      rebateAmount,
      basicPremium,
    };
  }
}

export default new RebateService();