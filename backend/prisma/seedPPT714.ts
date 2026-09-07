import { PrismaClient } from "@prisma/client";

export const seedPPT714 = async (
    prisma: PrismaClient
) => {
    const planNumber = "714";

    const product = await prisma.productMaster.findFirst({
        where: {
            planNumber,
        },
        select: {
            id: true,
            productName: true,
            planNumber: true,
        },
    });

    if (!product) {
        console.log(`❌ Plan ${planNumber} not found`);
        return;
    }

    console.log(
        `✔ Product: ${product.productName}`
    );

    let updated = 0;
    let skipped = 0;

    // Plan 714: Policy Term 12 to 35
    for (let policyTerm = 12; policyTerm <= 35; policyTerm++) {

        const rates =
            await prisma.productPremiumRate.findMany({
                where: {
                    productId: product.id,
                    policyTerm,
                    premiumPayingTerm: null,
                },
                select: {
                    id: true,
                    policyTerm: true,
                    premiumPayingTerm: true,
                },
            });

        if (rates.length === 0) {
            console.log(
                `⚠️ No NULL PPT records for term ${policyTerm}`
            );
            continue;
        }

        const result =
            await prisma.productPremiumRate.updateMany({
                where: {
                    productId: product.id,
                    policyTerm,
                    premiumPayingTerm: null,
                },
                data: {
                    premiumPayingTerm: policyTerm,
                },
            });

        updated += result.count;

        console.log(
            `✔ Term ${policyTerm} → PPT ${policyTerm} | Updated: ${result.count}`
        );
    }

    console.log("\n================================");
    console.log("PLAN 714 PPT SEEDING COMPLETE");
    console.log("================================");
    console.log(`Product : ${product.productName}`);
    console.log(`Terms   : 12 - 35`);
    console.log(`Updated : ${updated}`);
    console.log(`Skipped : ${skipped}`);
    console.log("================================\n");
};