import { PrismaClient } from "@prisma/client";
import Database from "better-sqlite3";

const CIR_PLANS = [
    "714",
    "715",
    // Add future plans here:
    // "717",
    // "720",
    // "721",
];

export const seedRiderPremiumCIR = async (
    prisma: PrismaClient
) => {
    const sqlite = new Database("./prisma/Creations.db", {
        readonly: true,
    });

    const tables = [
        {
            tableName: "cir_m_1",
            riderCode: "CIR",
            option: 1,
        },
        {
            tableName: "cir_m_2",
            riderCode: "CIR2",
            option: 2,
        },
    ];

    try {
        let totalInserted = 0;
        let totalSkipped = 0;
        let totalInvalid = 0;

        // ==================================================
        // PROCESS EACH PLAN
        // ==================================================
        for (const planNumber of CIR_PLANS) {
            console.log("\n=================================");
            console.log(`       CIR PLAN ${planNumber}`);
            console.log("=================================");

            // --------------------------------------------------
            // Find Product
            // --------------------------------------------------
            const product = await prisma.productMaster.findFirst({
                where: {
                    planNumber,
                },
            });

            if (!product) {
                console.log(
                    `❌ Product with planNumber ${planNumber} not found`
                );
                continue;
            }

            console.log(
                `✔ Product: ${product.productName} (${planNumber})`
            );
            console.log(`✔ Product ID: ${product.id}`);

            // --------------------------------------------------
            // Process cir_m_1 and cir_m_2
            // --------------------------------------------------
            for (const {
                tableName,
                riderCode,
                option,
            } of tables) {
                // ----------------------------------------------
                // Find Rider
                // ----------------------------------------------
                const rider = await prisma.riderMaster.findUnique({
                    where: {
                        riderCode,
                    },
                });

                if (!rider) {
                    console.log(
                        `❌ Rider with code ${riderCode} not found`
                    );
                    continue;
                }

                console.log(
                    `\n✔ Matched Rider: ${rider.riderName} (${rider.riderCode})`
                );

                // ----------------------------------------------
                // Read SQLite table
                // ----------------------------------------------
                const premiumRows = sqlite
                    .prepare(`SELECT * FROM "${tableName}"`)
                    .all() as any[];

                console.log(
                    `Processing ${tableName} - Option ${option} - Plan ${planNumber} (${premiumRows.length} rows)`
                );

                if (premiumRows.length === 0) {
                    console.log(
                        `❌ No data found in ${tableName}`
                    );
                    continue;
                }

                // ----------------------------------------------
                // Detect T5, T6 ... T25
                // ----------------------------------------------
                const termColumns = Object.keys(premiumRows[0])
                    .filter((key) => /^T\d+$/.test(key))
                    .sort((a, b) => {
                        const termA = Number(a.substring(1));
                        const termB = Number(b.substring(1));

                        return termA - termB;
                    });

                console.log(
                    "Term columns:",
                    termColumns
                );

                let inserted = 0;
                let skipped = 0;
                let invalid = 0;

                // ----------------------------------------------
                // Process rows
                // ----------------------------------------------
                for (const row of premiumRows) {
                    const entryAge = Number(row.Age);

                    if (Number.isNaN(entryAge)) {
                        console.log(
                            `⚠️ Invalid age: ${row.Age}`
                        );

                        invalid++;
                        continue;
                    }

                    for (const column of termColumns) {
                        const match = column.match(/^T(\d+)$/);

                        if (!match) {
                            continue;
                        }

                        // T5 -> Rider Term 5
                        // T6 -> Rider Term 6
                        // ...
                        const riderTerm = Number(match[1]);

                        const rate = Number(row[column]);

                        // ------------------------------------------
                        // Skip invalid rates
                        // ------------------------------------------
                        if (
                            row[column] == null ||
                            row[column] === "" ||
                            rate === 0 ||
                            Number.isNaN(rate)
                        ) {
                            continue;
                        }

                        // ------------------------------------------
                        // IMPORTANT:
                        //
                        // productId MUST be part of the lookup.
                        //
                        // Otherwise:
                        // Plan 714 Age 30 Term 20 Option 1
                        // could conflict with
                        // Plan 715 Age 30 Term 20 Option 1
                        // ------------------------------------------
                        const existing =
                            await prisma.riderPremiumRate.findFirst({
                                where: {
                                    productId: product.id,
                                    riderId: rider.id,
                                    entryAge,
                                    riderTerm,
                                    premiumPayingTerm: null,
                                    option,
                                },
                            });

                        if (existing) {
                            skipped++;
                            continue;
                        }

                        // ------------------------------------------
                        // Create CIR rate
                        // ------------------------------------------
                        await prisma.riderPremiumRate.create({
                            data: {
                                productId: product.id,
                                riderId: rider.id,
                                entryAge,
                                riderTerm,

                                // CIR is NOT PPT-specific
                                premiumPayingTerm: null,

                                option,
                                ratePerThousand: rate,
                            },
                        });

                        inserted++;
                    }
                }

                totalInserted += inserted;
                totalSkipped += skipped;
                totalInvalid += invalid;

                console.log("\n---------------------------------");
                console.log(`✔ Plan        : ${planNumber}`);
                console.log(`✔ Product ID  : ${product.id}`);
                console.log(`✔ Rider Code  : ${rider.riderCode}`);
                console.log(`✔ Source      : ${tableName}`);
                console.log(`✔ Option      : ${option}`);
                console.log(
                    `✔ Term Range  : ${termColumns[0]} - ${termColumns[termColumns.length - 1]}`
                );
                console.log(`✔ Inserted    : ${inserted}`);
                console.log(`✔ Skipped     : ${skipped}`);
                console.log(`✔ Invalid     : ${invalid}`);
                console.log("---------------------------------");
            }
        }

        // ==================================================
        // FINAL SUMMARY
        // ==================================================
        console.log("\n=================================");
        console.log("       CIR RIDER SEED COMPLETE");
        console.log("=================================");
        console.log(
            `✔ Plans Processed : ${CIR_PLANS.join(", ")}`
        );
        console.log(`✔ Total Inserted  : ${totalInserted}`);
        console.log(`✔ Total Skipped   : ${totalSkipped}`);
        console.log(`✔ Total Invalid   : ${totalInvalid}`);
        console.log(`✔ Option 1        : cir_m_1`);
        console.log(`✔ Option 2        : cir_m_2`);
        console.log("=================================\n");

    } catch (error) {
        console.error(
            "❌ Error seeding CIR rider premium rates:",
            error
        );

        throw error;
    } finally {
        sqlite.close();
    }
};