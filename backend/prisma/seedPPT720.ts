import { PrismaClient } from "@prisma/client";

export const seedPPT720 = async (prisma: PrismaClient) => {
    const planNumber = "720";

    const termPptMap: Record<number, number> = {
        20: 15,
    };

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
         * PLAN 720
         *
         * Policy Term -> PPT
         *
         * 20 -> 15
         */

        for (const [term, ppt] of Object.entries(termPptMap)) {
            const policyTerm = Number(term);
            const premiumPayingTerm = ppt;

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
        console.log("PLAN 720 PPT SEEDING COMPLETE");
        console.log("=================================");

        console.log(`Plan Number : ${product.planNumber}`);
        console.log(`Product     : ${product.productName}`);
        console.log(`Policy Term : 20`);
        console.log(`PPT         : 15`);
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