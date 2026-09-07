import { PrismaClient } from "@prisma/client";
import Database from "better-sqlite3";

export const seedPPT881 = async (prisma: PrismaClient) => {
    const sqlite = new Database("./prisma/Creations.db", {
        readonly: true,
    });

    const planNumber = "881";

    // Plan 881:
    // Policy Term = 25
    // PPT = 7 to 15
    const policyTerm = 25;
    const pptRange = {
        min: 7,
        max: 15,
    };

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
        });

        if (!product) {
            console.log(
                `❌ Plan ${planNumber} not found in ProductMaster`
            );
            return;
        }

        console.log(
            `✔ Matched Product: ${product.productName}`
        );
        console.log(`✔ Product ID: ${product.id}`);

        // -------------------------------------------------------
        // 2. Find existing premium records
        // -------------------------------------------------------

        const existingRates =
            await prisma.productPremiumRate.findMany({
                where: {
                    productId: product.id,
                    policyTerm,
                    premiumPayingTerm: null,
                },
            });

        console.log(
            `✔ Existing records without PPT: ${existingRates.length}`
        );

        if (existingRates.length === 0) {
            console.log(
                "⚠️ No records found with PPT = NULL."
            );
            return;
        }

        // -------------------------------------------------------
        // 3. Assign PPT
        // -------------------------------------------------------
        //
        // Plan 881:
        //
        // Policy Term = 25
        //
        // PPT:
        // 7
        // 8
        // 9
        // ...
        // 15
        //
        // Since the existing premium rate does not identify
        // which PPT it belongs to, this script creates the
        // PPT combinations from the existing rate.
        //
        // IMPORTANT:
        // Use this only if the source table/rate is applicable
        // to all PPT values 7-15.
        // -------------------------------------------------------

        let inserted = 0;
        let skipped = 0;

        for (const rate of existingRates) {
            for (
                let ppt = pptRange.min;
                ppt <= pptRange.max;
                ppt++
            ) {
                const existing =
                    await prisma.productPremiumRate.findFirst({
                        where: {
                            productId: product.id,
                            entryAge: rate.entryAge,
                            secondaryAge: rate.secondaryAge,
                            gender: rate.gender,
                            smoker: rate.smoker,
                            policyTerm,
                            premiumPayingTerm: ppt,
                            option: rate.option,
                        },
                    });

                if (existing) {
                    skipped++;
                    continue;
                }

                await prisma.productPremiumRate.create({
                    data: {
                        productId: product.id,

                        entryAge: rate.entryAge,
                        secondaryAge: rate.secondaryAge,

                        gender: rate.gender,
                        smoker: rate.smoker,

                        policyTerm,

                        premiumPayingTerm: ppt,

                        option: rate.option,

                        tabularRate: rate.tabularRate,

                        effectiveFrom: rate.effectiveFrom,
                        effectiveTo: rate.effectiveTo,
                    },
                });

                inserted++;
            }
        }

        console.log("\n=================================");
        console.log("PLAN 881 PPT SEEDING COMPLETE");
        console.log("=================================");

        console.log(`Plan Number : ${planNumber}`);
        console.log(`Policy Term : ${policyTerm}`);
        console.log(`PPT Range   : 7 - 15`);

        console.log(`Inserted    : ${inserted}`);
        console.log(`Skipped     : ${skipped}`);

        console.log("=================================\n");

    } catch (error) {
        console.error(
            `❌ Error while seeding PPT for Plan ${planNumber}:`,
            error
        );

        throw error;
    } finally {
        sqlite.close();

        console.log(
            "✔ SQLite database connection closed"
        );
    }
};