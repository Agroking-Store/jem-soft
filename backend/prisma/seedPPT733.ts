import { PrismaClient } from "@prisma/client";

export const seedPPT733 = async (prisma: PrismaClient) => {
    const planNumber = "733";

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
         * PLAN 733
         *
         * Policy Term : 13 - 25
         * PPT         : 10 - 22
         *
         * Mapping:
         *
         * Term 13 -> PPT 10
         * Term 14 -> PPT 11
         * Term 15 -> PPT 12
         * ...
         * Term 25 -> PPT 22
         *
         * Formula:
         * PPT = Policy Term - 3
         */

        for (let policyTerm = 13; policyTerm <= 25; policyTerm++) {
            const premiumPayingTerm = policyTerm - 3;

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
        console.log("PLAN 733 PPT SEEDING COMPLETE");
        console.log("=================================");

        console.log(`Plan Number : ${product.planNumber}`);
        console.log(`Product     : ${product.productName}`);
        console.log(`Terms       : 13 - 25`);
        console.log(`PPT         : 10 - 22`);
        console.log(`Formula     : PPT = Term - 3`);
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