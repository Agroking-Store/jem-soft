import { PrismaClient } from "@prisma/client";

export const seedPPT717 = async (prisma: PrismaClient) => {
    const planNumber = "717";

    try {
        console.log("\n=================================");
        console.log(`Starting PPT seeder for Plan ${planNumber}`);
        console.log("=================================\n");

        // Find product
        const product = await prisma.productMaster.findFirst({
            where: {
                planNumber,
            },
        });

        if (!product) {
            console.log(
                `❌ Plan ${planNumber} not found in ProductMaster`
            );
            return;
        }

        console.log(
            `✔ Matched Product: ${product.productName} (${product.planNumber})`
        );

        let updated = 0;
        let skipped = 0;

        /**
         * Plan 717:
         *
         * Policy Term : 10 - 25
         * PPT         : 1 (Single Premium)
         *
         * Example:
         * Term 10 -> PPT 1
         * Term 11 -> PPT 1
         * ...
         * Term 25 -> PPT 1
         */

        for (let policyTerm = 10; policyTerm <= 25; policyTerm++) {
            // Find all rates for this policy term
            const rates = await prisma.productPremiumRate.findMany({
                where: {
                    productId: product.id,
                    policyTerm,
                    premiumPayingTerm: null,
                },
            });

            console.log(
                `Term ${policyTerm}: ${rates.length} records found`
            );

            for (const rate of rates) {
                await prisma.productPremiumRate.update({
                    where: {
                        id: rate.id,
                    },
                    data: {
                        premiumPayingTerm: 1,
                    },
                });

                updated++;
            }

            if (rates.length === 0) {
                skipped++;
            }
        }

        console.log("\n=================================");
        console.log("PLAN 717 PPT SEEDING COMPLETE");
        console.log("=================================");

        console.log(`Plan Number : ${product.planNumber}`);
        console.log(`Product     : ${product.productName}`);
        console.log(`Terms       : 10 - 25`);
        console.log(`PPT         : 1`);
        console.log(`Updated     : ${updated}`);
        console.log(`Skipped     : ${skipped}`);

        console.log("=================================\n");
    } catch (error) {
        console.error(
            `❌ Error while seeding PPT for Plan ${planNumber}:`,
            error
        );

        throw error;
    }
};