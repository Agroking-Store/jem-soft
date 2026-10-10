import { PrismaClient } from "@prisma/client";

export const seedPPT721 = async (prisma: PrismaClient) => {
    const planNumber = "721";

    try {
        console.log("\n=================================");
        console.log(`Starting PPT seeder for Plan ${planNumber}`);
        console.log("=================================\n");

        // -------------------------------------------------------
        // 1. Find product
        // -------------------------------------------------------

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
            console.log(
                `❌ Plan ${planNumber} not found in ProductMaster`
            );
            return;
        }

        console.log(
            `✔ Product: ${product.productName}`
        );
        console.log(
            `✔ Product ID: ${product.id}`
        );

        // -------------------------------------------------------
        // 2. Plan 721 configuration
        // -------------------------------------------------------

        const policyTerm = 25;
        const premiumPayingTerm = 20;

        console.log(`Policy Term : ${policyTerm}`);
        console.log(`PPT         : ${premiumPayingTerm}`);

        // -------------------------------------------------------
        // 3. Find existing premium-rate records
        // -------------------------------------------------------
        //
        // We DO NOT create new premium-rate records.
        //
        // We only update the PPT of existing records where:
        //
        // productId = Plan 721
        // policyTerm = 25
        // premiumPayingTerm = NULL
        //
        // -------------------------------------------------------

        const existingRates =
            await prisma.productPremiumRate.findMany({
                where: {
                    productId: product.id,
                    policyTerm,
                    premiumPayingTerm: null,
                },
                select: {
                    id: true,
                    entryAge: true,
                    secondaryAge: true,
                    gender: true,
                    smoker: true,
                    option: true,
                    tabularRate: true,
                },
            });

        console.log(
            `\nExisting records found: ${existingRates.length}`
        );

        if (existingRates.length === 0) {
            console.log(
                "⚠️ No records found with NULL PPT."
            );
            return;
        }

        // -------------------------------------------------------
        // 4. Update PPT
        // -------------------------------------------------------

        let updated = 0;
        let skipped = 0;

        for (const rate of existingRates) {
            try {
                await prisma.productPremiumRate.update({
                    where: {
                        id: rate.id,
                    },
                    data: {
                        premiumPayingTerm,
                    },
                });

                updated++;

                console.log(
                    `✔ Age ${rate.entryAge} | Option ${rate.option ?? "NULL"} | PPT ${premiumPayingTerm}`
                );
            } catch (error) {
                skipped++;

                console.log(
                    `⚠️ Could not update record ${rate.id}:`,
                    error
                );
            }
        }

        // -------------------------------------------------------
        // 5. Summary
        // -------------------------------------------------------

        console.log("\n=================================");
        console.log("       PLAN 721 PPT COMPLETE");
        console.log("=================================");

        console.log(`Plan Number : ${product.planNumber}`);
        console.log(`Product     : ${product.productName}`);
        console.log(`Term        : ${policyTerm}`);
        console.log(`PPT         : ${premiumPayingTerm}`);

        console.log("\nResults:");
        console.log(`Found       : ${existingRates.length}`);
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
