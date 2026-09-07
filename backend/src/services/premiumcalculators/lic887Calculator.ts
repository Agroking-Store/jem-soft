import rebateService from "../rebateService.js";

interface CalculatorInput {
    productId: string;

    premiumMode: string;

    age: number;

    policyTerm: number;

    premiumPayingTerm: number;

    option: number;

    gender: string;

    smoker: boolean;

    sumAssured: number;

    tabularPremium: number;

    rate: number;
}

export async function calculateLIC887(
    data: CalculatorInput
) {
    const saRebate =
        await rebateService.calculateSumAssuredRebate(
            data.productId,
            data.sumAssured,
            data.tabularPremium
        );

    const basicYearlyPremium = Number(
        saRebate.basicPremium.toFixed(2)
    );

    return {
        saRebateRate: saRebate.rebateRate,

        saRebateAmount: saRebate.rebateAmount,

        modeRebateRate: 0,

        modeRebateAmount: 0,

        basicYearlyPremium,
    };
}