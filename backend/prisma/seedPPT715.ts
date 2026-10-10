import { PrismaClient } from "@prisma/client";

export const seedPPT715 = async (prisma: PrismaClient) => {
    const planNumber = "715";

    console.log("\n=================================");
    console.log(`Starting PPT Seeder for Plan ${planNumber}`);
    console.log("=================================\n");

    // Find product
    const product = await prisma.productMaster.findFirst({
        where: {
            planNumber,
        },
        select: {
            id: true,
            planNumber: true,
            productName: true,
        },
    });

    if (!product) {
        console.log(`❌ Plan ${planNumber} not found in ProductMaster`);
        return;
    }

    console.log(
        `✔ Product: ${product.productName} (${product.planNumber})`
    );
    console.log(`✔ Product ID: ${product.id}`);

    let updated = 0;
    let skipped = 0;

    /**
     * Plan 715
     *
     * Policy Term: 15 - 35
     * PPT: Same as Policy Term
     *
     * Example:
     * Term 15 → PPT 15
     * Term 16 → PPT 16
     * ...
     * Term 35 → PPT 35
     */

    for (let policyTerm = 15; policyTerm <= 35; policyTerm++) {
        const result = await prisma.productPremiumRate.updateMany({
            where: {
                productId: product.id,
                policyTerm,
                premiumPayingTerm: null,
            },
            data: {
                premiumPayingTerm: policyTerm,
            },
        });

        if (result.count > 0) {
            console.log(
                `✔ Term ${policyTerm} → PPT ${policyTerm} | Updated: ${result.count}`
            );

            updated += result.count;
        } else {
            console.log(
                `⚠️ Term ${policyTerm} → No NULL PPT records found`
            );

            skipped++;
        }
    }

    console.log("\n=================================");
    console.log(`PLAN ${planNumber} PPT SEEDING COMPLETE`);
    console.log("=================================");

    console.log(`Policy Terms : 15 - 35`);
    console.log(`PPT          : Same as Policy Term`);
    console.log(`Updated      : ${updated}`);
    console.log(`Terms Missing: ${skipped}`);

    console.log("=================================\n");
};