import { PrismaClient } from "@prisma/client";
import Database from "better-sqlite3";

const CIR_PLAN = "889";

export const seedRiderPremiumCIR889 = async (
    prisma: PrismaClient
) => {
    const sqlite = new Database("./prisma/Creations.db", {
        readonly: true,
    });

    const tables = [
        {
            tableName: "cir_889_o1_male",
            riderCode: "CIR",
            option: 1,
            gender: "MALE" as const,
        },
        {
            tableName: "cir_889_o2_male",
            riderCode: "CIR2",
            option: 2,
            gender: "MALE" as const,
        },
        {
            tableName: "cir_889_o1_female",
            riderCode: "CIR",
            option: 1,
            gender: "FEMALE" as const,
        },
        {
            tableName: "cir_889_o2_female",
            riderCode: "CIR2",
            option: 2,
            gender: "FEMALE" as const,
        },
    ];

    try {
        let totalInserted = 0;
        let totalSkipped = 0;
        let totalInvalid = 0;

        console.log("\n=================================");
        console.log("       CIR PLAN 889 SEED");
        console.log("=================================");

        // ==================================================
        // FIND PRODUCT
        // ==================================================

        const product = await prisma.productMaster.findFirst({
            where: {
                planNumber: CIR_PLAN,
            },
        });

        if (!product) {
            throw new Error(
                `Product with planNumber ${CIR_PLAN} not found`
            );
        }

        console.log(
            `✔ Product: ${product.productName} (${CIR_PLAN})`
        );
        console.log(`✔ Product ID: ${product.id}`);

        // ==================================================
        // PROCESS ALL FOUR TABLES
        // ==================================================

        for (const {
            tableName,
            riderCode,
            option,
            gender,
        } of tables) {
            console.log("\n=================================");
            console.log(`Source Table : ${tableName}`);
            console.log(`Option       : ${option}`);
            console.log(`Gender       : ${gender}`);
            console.log("=================================");

            // --------------------------------------------------
            // FIND RIDER
            // --------------------------------------------------

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
                `✔ Rider: ${rider.riderName} (${rider.riderCode})`
            );

            // --------------------------------------------------
            // READ SQLITE TABLE
            // --------------------------------------------------

            const premiumRows = sqlite
                .prepare(`SELECT * FROM "${tableName}"`)
                .all() as Record<string, any>[];

            console.log(
                `✔ SQLite Rows: ${premiumRows.length}`
            );

            if (premiumRows.length === 0) {
                console.log(
                    `⚠️ No data found in ${tableName}`
                );
                continue;
            }

            // --------------------------------------------------
            // DETECT TERM + PPT COLUMNS
            //
            // Examples:
            // T10_5  -> Term 10, PPT 5
            // T20_10 -> Term 20, PPT 10
            // T25_15 -> Term 25, PPT 15
            // --------------------------------------------------

            const rateColumns = Object.keys(premiumRows[0])
                .filter((key) => /^T\d+_\d+$/.test(key))
                .sort((a, b) => {
                    const [, termA, pptA] =
                        a.match(/^T(\d+)_(\d+)$/)!;

                    const [, termB, pptB] =
                        b.match(/^T(\d+)_(\d+)$/)!;

                    if (Number(termA) !== Number(termB)) {
                        return Number(termA) - Number(termB);
                    }

                    return Number(pptA) - Number(pptB);
                });

            console.log(
                `✔ Rate Columns: ${rateColumns.join(", ")}`
            );

            let inserted = 0;
            let skipped = 0;
            let invalid = 0;

            // ==================================================
            // PROCESS AGE ROWS
            // ==================================================

            for (const row of premiumRows) {
                const entryAge = Number(row.Age);

                if (Number.isNaN(entryAge)) {
                    console.log(
                        `⚠️ Invalid age: ${row.Age}`
                    );

                    invalid++;
                    continue;
                }

                // --------------------------------------------------
                // PROCESS EACH TERM + PPT
                // --------------------------------------------------

                for (const column of rateColumns) {
                    const match = column.match(
                        /^T(\d+)_(\d+)$/
                    );

                    if (!match) {
                        continue;
                    }

                    const riderTerm = Number(match[1]);
                    const premiumPayingTerm = Number(match[2]);

                    const rawRate = row[column];

                    // --------------------------------------------------
                    // SKIP EMPTY / INVALID RATE
                    // --------------------------------------------------

                    if (
                        rawRate === null ||
                        rawRate === undefined ||
                        rawRate === ""
                    ) {
                        continue;
                    }

                    const rate = Number(rawRate);

                    if (
                        Number.isNaN(rate) ||
                        rate === 0
                    ) {
                        continue;
                    }

                    // --------------------------------------------------
                    // CHECK EXISTING RATE
                    //
                    // productId + riderId + age + term + PPT
                    // + option + gender
                    // --------------------------------------------------

                    const existing =
                        await prisma.riderPremiumRate.findFirst({
                            where: {
                                productId: product.id,
                                riderId: rider.id,
                                entryAge,
                                riderTerm,
                                premiumPayingTerm,
                                option,
                                gender,
                            },
                        });

                    if (existing) {
                        skipped++;
                        continue;
                    }

                    // --------------------------------------------------
                    // INSERT
                    // --------------------------------------------------

                    await prisma.riderPremiumRate.create({
                        data: {
                            productId: product.id,
                            riderId: rider.id,
                            entryAge,
                            riderTerm,

                            // CIR 889 IS PPT-SPECIFIC
                            premiumPayingTerm,

                            option,
                            gender,
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
            console.log(`✔ Plan       : ${CIR_PLAN}`);
            console.log(`✔ Product ID : ${product.id}`);
            console.log(`✔ Rider      : ${rider.riderCode}`);
            console.log(`✔ Source     : ${tableName}`);
            console.log(`✔ Option     : ${option}`);
            console.log(`✔ Gender     : ${gender}`);
            console.log(`✔ Ages       : 18 - 50`);
            console.log(`✔ Rates      : ${rateColumns.length}`);
            console.log(`✔ Inserted   : ${inserted}`);
            console.log(`✔ Skipped    : ${skipped}`);
            console.log(`✔ Invalid    : ${invalid}`);
            console.log("---------------------------------");
        }

        // ==================================================
        // FINAL SUMMARY
        // ==================================================

        console.log("\n=================================");
        console.log("       CIR PLAN 889 COMPLETE");
        console.log("=================================");

        console.log(`✔ Plan            : ${CIR_PLAN}`);
        console.log(`✔ Tables Processed: ${tables.length}`);
        console.log(`✔ Total Inserted  : ${totalInserted}`);
        console.log(`✔ Total Skipped   : ${totalSkipped}`);
        console.log(`✔ Total Invalid   : ${totalInvalid}`);

        console.log("\n✔ Sources:");

        for (const table of tables) {
            console.log(
                `   Option ${table.option} - ${table.gender} -> ${table.tableName}`
            );
        }

        console.log("=================================\n");
    } catch (error) {
        console.error(
            "❌ Error seeding CIR Plan 889:",
            error
        );

        throw error;
    } finally {
        sqlite.close();
    }
};
