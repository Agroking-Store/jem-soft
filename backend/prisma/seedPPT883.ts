import { PrismaClient } from "@prisma/client";
import Database from "better-sqlite3";

export const seedPPT883 = async (prisma: PrismaClient) => {
    const sqlite = new Database("./prisma/Creations.db", {
        readonly: true,
    });

    const planNumber = "883";
    const sourceTable = "table_883";

    /**
     * =========================================================
     * LIC PLAN 883 - PPT / GUA. ADDN. PERIOD SEEDER
     * =========================================================
     *
     * SQLite:
     *
     * table_883
     *
     * Columns:
     *
     * Age
     * T7
     * T8
     * T9
     * T10
     * ...
     * T17
     *
     * IMPORTANT:
     *
     * T7 - T17 are NOT policy terms.
     *
     * They represent:
     *
     * Gua. Addn. Period
     *
     * which is stored in Prisma as:
     *
     * premiumPayingTerm
     *
     * Policy Term:
     *
     *     100 - Age
     *
     * Example:
     *
     * Age = 30
     *
     * Policy Term = 70
     *
     * T7  -> PPT 7
     * T8  -> PPT 8
     * ...
     * T17 -> PPT 17
     *
     * =========================================================
     */

    const pptColumns = [
        { column: "T7", ppt: 7 },
        { column: "T8", ppt: 8 },
        { column: "T9", ppt: 9 },
        { column: "T10", ppt: 10 },
        { column: "T11", ppt: 11 },
        { column: "T12", ppt: 12 },
        { column: "T13", ppt: 13 },
        { column: "T14", ppt: 14 },
        { column: "T15", ppt: 15 },
        { column: "T16", ppt: 16 },
        { column: "T17", ppt: 17 },
    ];

    try {
        console.log("\n==============================================");
        console.log("       PLAN 883 PPT PREMIUM SEEDER");
        console.log("==============================================\n");

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
            `✔ Matched Product : ${product.productName}`
        );

        console.log(
            `✔ Product ID      : ${product.id}`
        );

        // -------------------------------------------------------
        // 2. Verify source table
        // -------------------------------------------------------

        const tableExists = sqlite
            .prepare(
                `
                SELECT name
                FROM sqlite_master
                WHERE type = 'table'
                AND name = ?
                `
            )
            .get(sourceTable);

        if (!tableExists) {
            console.log(
                `❌ SQLite table ${sourceTable} not found`
            );
            return;
        }

        console.log(
            `✔ SQLite Table    : ${sourceTable}`
        );

        // -------------------------------------------------------
        // 3. Read premium rows
        // -------------------------------------------------------

        const rows = sqlite
            .prepare(`SELECT * FROM "${sourceTable}"`)
            .all() as Record<string, unknown>[];

        console.log(
            `✔ Rows found      : ${rows.length}`
        );

        if (rows.length === 0) {
            console.log(
                `⚠️ No rows found in ${sourceTable}`
            );
            return;
        }

        // -------------------------------------------------------
        // 4. Verify T7 - T17 columns
        // -------------------------------------------------------

        const availableColumns = Object.keys(rows[0]);

        console.log("\nGua. Addn. Period / PPT columns:");

        for (const { column, ppt } of pptColumns) {
            if (availableColumns.includes(column)) {
                console.log(
                    `  ${column} → Gua. Addn. Period / PPT ${ppt}`
                );
            } else {
                console.log(
                    `  ⚠️ ${column} not found`
                );
            }
        }

        let totalInserted = 0;
        let totalSkipped = 0;
        let totalInvalid = 0;

        // -------------------------------------------------------
        // 5. Process every age
        // -------------------------------------------------------

        for (const row of rows) {
            const age = Number(row.Age);

            if (
                row.Age == null ||
                row.Age === "" ||
                !Number.isFinite(age)
            ) {
                console.log(
                    `⚠️ Invalid Age: ${row.Age}`
                );

                totalInvalid++;
                continue;
            }

            // ---------------------------------------------------
            // Policy Term = 100 - Age
            // ---------------------------------------------------

            const policyTerm = 100 - age;

            if (policyTerm <= 0) {
                console.log(
                    `⚠️ Invalid Policy Term for Age ${age}`
                );

                totalInvalid++;
                continue;
            }

            // ---------------------------------------------------
            // Process T7 - T17
            // ---------------------------------------------------

            for (const { column, ppt } of pptColumns) {

                if (!availableColumns.includes(column)) {
                    continue;
                }

                const rawRate = row[column];

                // Invalid value
                if (
                    rawRate == null ||
                    rawRate === "" ||
                    !Number.isFinite(Number(rawRate))
                ) {
                    totalInvalid++;

                    console.log(
                        `⚠️ Invalid rate | Age ${age} | PPT ${ppt}`
                    );

                    continue;
                }

                const rate = Number(rawRate);

                // Zero means no valid premium
                if (rate === 0) {
                    continue;
                }

                // ------------------------------------------------
                // Check duplicate
                // ------------------------------------------------

                const existing =
                    await prisma.productPremiumRate.findFirst({
                        where: {
                            productId: product.id,

                            entryAge: age,

                            secondaryAge: null,

                            gender: null,

                            smoker: null,

                            policyTerm,

                            premiumPayingTerm: ppt,

                            option: null,
                        },
                    });

                if (existing) {
                    totalSkipped++;
                    continue;
                }

                // ------------------------------------------------
                // Insert
                // ------------------------------------------------

                await prisma.productPremiumRate.create({
                    data: {
                        productId: product.id,

                        entryAge: age,

                        secondaryAge: null,

                        gender: null,

                        smoker: null,

                        policyTerm,

                        premiumPayingTerm: ppt,

                        option: null,

                        tabularRate: rate,
                    },
                });

                totalInserted++;
            }
        }

        // -------------------------------------------------------
        // 6. Summary
        // -------------------------------------------------------

        console.log("\n==============================================");
        console.log("       PLAN 883 SEEDING COMPLETE");
        console.log("==============================================");

        console.log(`Plan Number       : ${planNumber}`);
        console.log(`Product           : ${product.productName}`);
        console.log(`Product ID        : ${product.id}`);

        console.log("\nPolicy Term:");
        console.log("  Policy Term = 100 - Entry Age");

        console.log("\nGua. Addn. Period / PPT:");
        console.log("  T7  → PPT 7");
        console.log("  T8  → PPT 8");
        console.log("  T9  → PPT 9");
        console.log("  T10 → PPT 10");
        console.log("  T11 → PPT 11");
        console.log("  T12 → PPT 12");
        console.log("  T13 → PPT 13");
        console.log("  T14 → PPT 14");
        console.log("  T15 → PPT 15");
        console.log("  T16 → PPT 16");
        console.log("  T17 → PPT 17");

        console.log("\nDatabase Mapping:");
        console.log(
            "  premiumPayingTerm = Gua. Addn. Period"
        );

        console.log("\nResults:");
        console.log(`  Inserted : ${totalInserted}`);
        console.log(`  Skipped  : ${totalSkipped}`);
        console.log(`  Invalid  : ${totalInvalid}`);

        console.log("==============================================\n");

    } catch (error) {
        console.error(
            `❌ Error while seeding Plan ${planNumber}:`,
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
