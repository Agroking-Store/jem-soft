import { prisma } from "../config/database.js";

class ModeRebateService {
  async calculateModeRebate(
    productId: string,
    premiumMode: string,
    age: number,
    policyTerm: number,
    basicPremium: number
  ) {
    // Find Premium Mode
    const mode = await prisma.premiumModeMaster.findFirst({
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
    });

    if (!mode) {
      return {
        rebateRate: 0,
        rebateAmount: 0,
      };
    }

    // Find Age & Policy Term specific rebate
    const rebate = await prisma.productModeRebateRate.findFirst({
      where: {
        productId,
        premiumModeId: mode.id,
        entryAge: age, 
        policyTerm,
      },
    });

    if (!rebate) {
      return {
        rebateRate: 0,
        rebateAmount: 0,
      };
    }

    const rebateRate = Number(rebate.rebatePerThousand);

    // Rebate = Basic Premium ÷ 1000 × Rebate Rate
    const rebateAmount = Number(
      ((basicPremium / 1000) * rebateRate).toFixed(2)
    );

    return {
      rebateRate,
      rebateAmount,
    };
  }
}

export default new ModeRebateService();