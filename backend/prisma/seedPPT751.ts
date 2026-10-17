import { PrismaClient } from "@prisma/client";

export const seedPPT751 = async (prisma: PrismaClient) => {
    const planNumber = "751";

    try {
        console.log("\n==============================================");
        console.log("       PLAN 751 PPT SEEDER");
        console.log("==============================================\n");

        // --------------------------------------------------
        // 1. Find Product
        // --------------------------------------------------

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

        console.log(`✔ Product    : ${product.productName}`);
        console.log(`✔ Product ID : ${product.id}`);

        // --------------------------------------------------
        // 2. Plan 751 Rules
        // --------------------------------------------------
        //
        // Policy Term : 10 - 15
        //
        // PPT = Policy Term
        //
        // 10 -> 10
        // 11 -> 11
        // 12 -> 12
        // 13 -> 13
        // 14 -> 14
        // 15 -> 15
        //
        // --------------------------------------------------

        const minTerm = 10;
        const maxTerm = 15;

        let totalInserted = 0;
        let totalSkipped = 0;

        // --------------------------------------------------
        // 3. Get existing Plan 751 rates
        // --------------------------------------------------

        const existingRates =
            await prisma.productPremiumRate.findMany({
                where: {
                    productId: product.id,
                },
                select: {
                    id: true,
                    entryAge: true,
                    secondaryAge: true,
                    gender: true,
                    smoker: true,
                    policyTerm: true,
                    premiumPayingTerm: true,
                    option: true,
                    tabularRate: true,
                },
                orderBy: [
                    {
                        entryAge: "asc",
                    },
                    {
                        policyTerm: "asc",
                    },
                ],
            });

        console.log(
            `✔ Existing Plan 751 records: ${existingRates.length}`
        );

        // --------------------------------------------------
        // 4. Process each original rate
        // --------------------------------------------------
        //
        // Only use records where PPT is NULL.
        //
        // This prevents records created by this seeder from
        // being used as source records on another run.
        //
        // --------------------------------------------------

        const sourceRates = existingRates.filter(
            (rate) =>
                rate.premiumPayingTerm === null &&
                rate.policyTerm >= minTerm &&
                rate.policyTerm <= maxTerm
        );

        console.log(
            `✔ Source records found: ${sourceRates.length}`
        );

        // --------------------------------------------------
        // 5. Process every source record
        // --------------------------------------------------

        for (const sourceRate of sourceRates) {
            const policyTerm = sourceRate.policyTerm;

            // ------------------------------------------------
            // PPT = Policy Term
            // ------------------------------------------------

            const premiumPayingTerm = policyTerm;

            // ------------------------------------------------
            // Check duplicate
            // ------------------------------------------------

            const existing =
                await prisma.productPremiumRate.findFirst({
                    where: {
                        productId: product.id,

                        entryAge: sourceRate.entryAge,

                        secondaryAge:
                            sourceRate.secondaryAge,

                        gender:
                            sourceRate.gender,

                        smoker:
                            sourceRate.smoker,

                        policyTerm,

                        premiumPayingTerm,

                        option:
                            sourceRate.option,
                    },
                });

            if (existing) {
                totalSkipped++;
                continue;
            }

            // ------------------------------------------------
            // Create PPT record
            // ------------------------------------------------

            await prisma.productPremiumRate.create({
                data: {
                    productId: product.id,

                    entryAge:
                        sourceRate.entryAge,

                    secondaryAge:
                        sourceRate.secondaryAge,

                    gender:
                        sourceRate.gender,

                    smoker:
                        sourceRate.smoker,

                    policyTerm,

                    premiumPayingTerm,

                    option:
                        sourceRate.option,

                    // Keep original tabular rate
                    tabularRate:
                        sourceRate.tabularRate,
                },
            });

            totalInserted++;

            const smokerLabel =
                sourceRate.smoker === true
                    ? "Smoker"
                    : sourceRate.smoker === false
                        ? "Non-Smoker"
                        : "Smoker NULL";

            console.log(
                `✔ Age ${sourceRate.entryAge} | Term ${policyTerm} | PPT ${premiumPayingTerm} | ${smokerLabel}`
            );
        }

        // --------------------------------------------------
        // 6. Final Summary
        // --------------------------------------------------

        console.log("\n==============================================");
        console.log("       PLAN 751 PPT SEEDING COMPLETE");
        console.log("==============================================");

        console.log(`Plan Number : ${planNumber}`);
        console.log(`Product     : ${product.productName}`);
        console.log(`Product ID  : ${product.id}`);

        console.log("\nRules:");
        console.log("Policy Term : 10 - 15");
        console.log("PPT         : Same as Policy Term");

        console.log("\nMapping:");
        console.log("Term 10 → PPT 10");
        console.log("Term 11 → PPT 11");
        console.log("Term 12 → PPT 12");
        console.log("Term 13 → PPT 13");
        console.log("Term 14 → PPT 14");
        console.log("Term 15 → PPT 15");

        console.log("\nResults:");
        console.log(`Inserted    : ${totalInserted}`);
        console.log(`Skipped     : ${totalSkipped}`);

        console.log("==============================================\n");
    } catch (error) {
        console.error(
            `❌ Error while seeding PPT for Plan ${planNumber}:`,
            error
        );

        throw error;
    }
};