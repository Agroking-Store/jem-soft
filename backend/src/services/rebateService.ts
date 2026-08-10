import { prisma } from "../config/database.js";

class RebateService {
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