import { PrismaClient } from "@prisma/client";

export const seedPPT736 = async (prisma: PrismaClient) => {
    const planNumber = "736";

    // Plan 736: Policy Term -> PPT
    const termPptMap: Record<number, number> = {
        16: 10,
        21: 15,
        25: 16,
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
        console.log("PLAN 736 PPT SEEDING COMPLETE");
        console.log("=================================");

        console.log(`Plan Number : ${product.planNumber}`);
        console.log(`Product     : ${product.productName}`);
        console.log(`Term 16     : PPT 10`);
        console.log(`Term 21     : PPT 15`);
        console.log(`Term 25     : PPT 16`);
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