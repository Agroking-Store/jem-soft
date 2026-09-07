import { PrismaClient } from "@prisma/client";

export const seedPPT887 = async (prisma: PrismaClient) => {
    const planNumber = "887";

    try {
        console.log("\n==============================================");
        console.log("       PLAN 887 PPT SEEDER");
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
        // 2. PPT Rules
        // --------------------------------------------------

        const basePPTs = [5, 10, 15];

        let totalInserted = 0;
        let totalSkipped = 0;

        // --------------------------------------------------
        // 3. Get ALL existing Plan 887 premium records
        // --------------------------------------------------
        //
        // IMPORTANT:
        // We intentionally retrieve smoker and non-smoker
        // separately.
        //
        // smoker = false -> Non-Smoker
        // smoker = true  -> Smoker
        //
        // secondaryAge must be NULL for Plan 887.
        //
        // --------------------------------------------------

        const existingRates =
            await prisma.productPremiumRate.findMany({
                where: {
                    productId: product.id,
                    secondaryAge: null,
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
            `✔ Existing Plan 887 records: ${existingRates.length}`
        );

        // --------------------------------------------------
        // 4. Get all ages
        // --------------------------------------------------

        const ages = [
            ...new Set(
                existingRates.map(
                    (rate) => rate.entryAge
                )
            ),
        ].sort((a, b) => a - b);

        console.log(
            `✔ Ages found: ${ages.length}`
        );

        // --------------------------------------------------
        // 5. Process every age
        // --------------------------------------------------

        for (const age of ages) {
            const maxTerm = 100 - age;

            if (maxTerm < 10) {
                console.log(
                    `⚠️ Age ${age}: maximum term ${maxTerm} is below 10`
                );

                continue;
            }

            console.log("\n==============================================");
            console.log(`Age        : ${age}`);
            console.log(`Max Term   : ${maxTerm}`);
            console.log(`Terms      : 10 - ${maxTerm}`);
            console.log("==============================================");

            // ------------------------------------------------
            // 6. Get every source record for this age
            // ------------------------------------------------
            //
            // This is important because the source DB contains:
            //
            // Non-Smoker
            // Smoker
            //
            // and potentially different gender/option values.
            //
            // We process each source record independently.
            // ------------------------------------------------

            const ageRates = existingRates.filter(
                (rate) =>
                    rate.entryAge === age &&
                    rate.policyTerm >= 10 &&
                    rate.policyTerm <= maxTerm
            );

            // ------------------------------------------------
            // 7. Process every source rate
            // ------------------------------------------------

            for (const sourceRate of ageRates) {
                // ------------------------------------------------
                // IMPORTANT:
                //
                // Do NOT process an already-created PPT record
                // as the source for another PPT.
                //
                // We only want the original rate for the term.
                // ------------------------------------------------

                if (
                    sourceRate.premiumPayingTerm !== null
                ) {
                    continue;
                }

                const policyTerm =
                    sourceRate.policyTerm;

                // ------------------------------------------------
                // PPT list
                // ------------------------------------------------

                const ppts = [...basePPTs];

                // ------------------------------------------------
                // Maximum term:
                //
                // Example:
                // Age 21
                // Max term = 79
                //
                // Term 79:
                // PPT = 1, 5, 10, 15, 79
                // ------------------------------------------------

                if (policyTerm === maxTerm) {
                    ppts.push(1);
                    ppts.push(maxTerm);
                }

                const uniquePPTs = [
                    ...new Set(ppts),
                ];

                // ------------------------------------------------
                // 8. Process every PPT
                // ------------------------------------------------

                for (const ppt of uniquePPTs) {
                    // ----------------------------------------------
                    // Check duplicate
                    // ----------------------------------------------

                    const existing =
                        await prisma.productPremiumRate.findFirst({
                            where: {
                                productId: product.id,

                                entryAge: age,

                                // Plan 887 has NO secondary age
                                secondaryAge: null,

                                // Preserve gender
                                gender: sourceRate.gender,

                                // Preserve smoker/non-smoker
                                smoker: sourceRate.smoker,

                                policyTerm,

                                premiumPayingTerm: ppt,

                                option: sourceRate.option,
                            },
                        });

                    if (existing) {
                        totalSkipped++;

                        continue;
                    }

                    // ----------------------------------------------
                    // Insert PPT record
                    // ----------------------------------------------

                    await prisma.productPremiumRate.create({
                        data: {
                            productId: product.id,

                            entryAge: age,

                            // Plan 887 does not have secondary age
                            secondaryAge: null,

                            // Preserve source gender
                            gender: sourceRate.gender,

                            // IMPORTANT:
                            // Preserve smoker/non-smoker
                            smoker: sourceRate.smoker,

                            policyTerm,

                            premiumPayingTerm: ppt,

                            option: sourceRate.option,

                            // Use the original tabular rate
                            tabularRate: sourceRate.tabularRate,
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
                        `✔ Age ${age} | Term ${policyTerm} | PPT ${ppt} | ${smokerLabel} | Gender ${sourceRate.gender ?? "NULL"}`
                    );
                }
            }
        }

        // --------------------------------------------------
        // 9. Final Summary
        // --------------------------------------------------

        console.log("\n==============================================");
        console.log("       PLAN 887 PPT SEEDING COMPLETE");
        console.log("==============================================");

        console.log(
            `Plan Number : ${planNumber}`
        );

        console.log(
            `Product     : ${product.productName}`
        );

        console.log(
            `Inserted    : ${totalInserted}`
        );

        console.log(
            `Skipped     : ${totalSkipped}`
        );

        console.log("\nRules:");
        console.log(
            "Policy Term : 10 to (100 - Entry Age)"
        );

        console.log(
            "Normal PPT  : 5, 10, 15"
        );

        console.log(
            "Maximum PPT : 100 - Entry Age"
        );

        console.log(
            "Single PPT  : 1 (only at maximum term)"
        );

        console.log(
            "Secondary Age : NULL"
        );

        console.log(
            "Smoker       : Preserve TRUE/FALSE from source"
        );

        console.log(
            "Gender       : Preserve from source"
        );

        console.log("\nExample Age 21:");

        console.log(
            "Terms       : 10 - 79"
        );

        console.log(
            "Term 10-78  : PPT 5, 10, 15"
        );

        console.log(
            "Term 79     : PPT 1, 5, 10, 15, 79"
        );

        console.log(
            "\nBoth Smoker and Non-Smoker records are seeded separately."
        );

        console.log("==============================================\n");
    } catch (error) {
        console.error(
            `❌ Error while seeding PPT for Plan ${planNumber}:`,
            error
        );

        throw error;
    }
};