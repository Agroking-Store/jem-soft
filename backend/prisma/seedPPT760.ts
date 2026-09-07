import { PrismaClient } from "@prisma/client";

export const seedPPT760 = async (prisma: PrismaClient) => {
    const planNumber = "760";

    try {
        console.log("\n=================================");
        console.log(`Starting PPT seeder for Plan ${planNumber}`);
        console.log("=================================\n");

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
        console.log(`✔ Product ID: ${product.id}`);

        let updated = 0;
        let skipped = 0;

        /**
         * PLAN 760
         *
         * Policy Term : 15 - 20
         * PPT         : 10 - 15
         *
         * Mapping:
         *
         * Term 15 -> PPT 10
         * Term 16 -> PPT 11
         * Term 17 -> PPT 12
         * Term 18 -> PPT 13
         * Term 19 -> PPT 14
         * Term 20 -> PPT 15
         *
         * Formula:
         * PPT = Policy Term - 5
         */

        for (let policyTerm = 15; policyTerm <= 20; policyTerm++) {
            const premiumPayingTerm = policyTerm - 5;

            const rates = await prisma.productPremiumRate.findMany({
                where: {
                    productId: product.id,
                    policyTerm,
                    premiumPayingTerm: null,
                },
            });

            console.log(
                `Term ${policyTerm} → PPT ${premiumPayingTerm} | ` +
                `${rates.length} records found`
            );

            if (rates.length === 0) {
                skipped++;
                continue;
            }

            for (const rate of rates) {
                await prisma.productPremiumRate.update({
                    where: {
                        id: rate.id,
                    },
                    data: {
                        premiumPayingTerm,
                    },
                });

                updated++;
            }
        }

        console.log("\n=================================");
        console.log("PLAN 760 PPT SEEDING COMPLETE");
        console.log("=================================");

        console.log(`Plan Number : ${product.planNumber}`);
        console.log(`Product     : ${product.productName}`);
        console.log(`Terms       : 15 - 20`);
        console.log(`PPT         : 10 - 15`);
        console.log(`Formula     : PPT = Term - 5`);
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