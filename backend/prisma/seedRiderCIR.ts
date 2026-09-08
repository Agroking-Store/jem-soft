import { PrismaClient } from "@prisma/client";
import Database from "better-sqlite3";

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

        // --------------------------------------------------
        // Process cir_m_1 and cir_m_2
        // --------------------------------------------------
        for (const { tableName, riderCode, option } of tables) {
            // Find Rider
            const rider = await prisma.riderMaster.findUnique({
                where: {
                    riderCode,
                },
            });

            if (!rider) {
                console.log(
                    `❌ Rider with code ${riderCode} not found in RiderMaster`
                );
                continue;
            }

            console.log(
                `Matched Rider: ${rider.riderName} (${rider.riderCode})`
            );

            const premiumRows = sqlite
                .prepare(`SELECT * FROM "${tableName}"`)
                .all() as any[];

            console.log(
                `\nProcessing ${tableName} - Option ${option} (${premiumRows.length} rows)`
            );

            if (premiumRows.length === 0) {
                console.log(`❌ No data found in ${tableName}`);
                continue;
            }

            // Detect columns like T5, T6, T7 ... T25
            const termColumns = Object.keys(premiumRows[0])
                .filter((key) => /^T\d+$/.test(key))
                .sort((a, b) => {
                    const termA = Number(a.substring(1));
                    const termB = Number(b.substring(1));

                    return termA - termB;
                });

            console.log("Term columns:", termColumns);

            let inserted = 0;
            let skipped = 0;

            for (const row of premiumRows) {
                const entryAge = Number(row.Age);

                if (Number.isNaN(entryAge)) {
                    console.log(`⚠️ Invalid age: ${row.Age}`);
                    continue;
                }

                for (const column of termColumns) {
                    const match = column.match(/^T(\d+)$/);

                    if (!match) {
                        continue;
                    }

                    const riderTerm = Number(match[1]);
                    const rate = Number(row[column]);

                    // Skip empty / zero / invalid rates
                    if (
                        row[column] == null ||
                        row[column] === "" ||
                        rate === 0 ||
                        Number.isNaN(rate)
                    ) {
                        continue;
                    }

                    // Check existing record
                    const existing =
                        await prisma.riderPremiumRate.findUnique({
                            where: {
                                riderId_entryAge_riderTerm_option: {
                                    riderId: rider.id,
                                    entryAge,
                                    riderTerm,
                                    option,
                                },
                            },
                        });

                    if (existing) {
                        skipped++;
                        continue;
                    }

                    await prisma.riderPremiumRate.create({
                        data: {
                            riderId: rider.id,
                            entryAge,
                            riderTerm,
                            option,
                            ratePerThousand: rate,
                        },
                    });

                    inserted++;
                }
            }

            totalInserted += inserted;
            totalSkipped += skipped;

            console.log("\n=================================");
            console.log(`✔ Rider Code : ${rider.riderCode}`);
            console.log(`✔ Rider Name : ${rider.riderName}`);
            console.log(`✔ Source     : ${tableName}`);
            console.log(`✔ Option     : ${option}`);
            console.log(
                `✔ Term Range : ${termColumns[0]} - ${termColumns[termColumns.length - 1]
                }`
            );
            console.log(`✔ Inserted   : ${inserted}`);
            console.log(`✔ Skipped    : ${skipped}`);
            console.log("=================================");
        }

        console.log("\n=================================");
        console.log("       CIR RIDER SEED COMPLETE");
        console.log("=================================");
        console.log(`✔ Rider Code      : ${rider.riderCode}`);
        console.log(`✔ Total Inserted  : ${totalInserted}`);
        console.log(`✔ Total Skipped   : ${totalSkipped}`);
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