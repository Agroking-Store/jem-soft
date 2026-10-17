import { PrismaClient } from "@prisma/client";
import Database from "better-sqlite3";

export const seedPPT771 = async (prisma: PrismaClient) => {
    const sqlite = new Database("./prisma/Creations.db", {
        readonly: true,
    });

    const planNumber = "771";

    /**
     * =========================================================
     * LIC PLAN 771
     * =========================================================
     *
     * Policy Term:
     *   100 - Age
     *
     * PPT:
     *   5 to 16
     *
     * Example:
     *
     * Age 30
     * Policy Term = 100 - 30 = 70
     *
     * PPT:
     * 5, 6, 7, ... 16
     *
     * Database:
     *
     * entryAge          = 30
     * policyTerm        = 70
     * premiumPayingTerm = 5/6/7/.../16
     *
     * =========================================================
     */

    const pptRange = {
        min: 5,
        max: 16,
    };

    try {
        console.log("\n==============================================");
        console.log("       PLAN 771 PPT PREMIUM SEEDER");
        console.log("==============================================\n");

        // -------------------------------------------------------
        // 1. Find Product
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
            `✔ Matched Product: ${product.productName} `
        );

        console.log(
            `✔ Product ID: ${product.id} `
        );

        // -------------------------------------------------------
        // 2. Find SQLite table
        // -------------------------------------------------------

        const tables = sqlite
            .prepare(
                `
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
          AND name LIKE ?
    ORDER BY name
        `
            )
            .all("%771%") as { name: string }[];

        console.log("\nSQLite tables containing 771:");

        for (const table of tables) {
            console.log(`  - ${table.name} `);
        }

        if (tables.length === 0) {
            console.log(
                "❌ No SQLite table containing 771 was found."
            );
            return;
        }

        // -------------------------------------------------------
        // 3. Find the premium table
        // -------------------------------------------------------
        //
        // The seeder expects the source table to contain:
        //
        // Age
        // T5
        // T6
        // ...
        // T16
        //
        // If your source uses a different table structure,
        // change SOURCE_TABLE below.
        // -------------------------------------------------------

        const SOURCE_TABLE = tables[0].name;

        console.log(
            `\n✔ Using SQLite table: ${SOURCE_TABLE} `
        );

        // -------------------------------------------------------
        // 4. Read source rows
        // -------------------------------------------------------

        const rows = sqlite
            .prepare(`SELECT * FROM "${SOURCE_TABLE}"`)
            .all() as Record<string, unknown>[];

        console.log(
            `✔ Rows found: ${rows.length} `
        );

        if (rows.length === 0) {
            console.log(
                "⚠️ No rows found in source table."
            );
            return;
        }

        // -------------------------------------------------------
        // 5. Detect PPT columns
        // -------------------------------------------------------

        const firstRow = rows[0];

        const pptColumns = Object.keys(firstRow)
            .filter((column) => /^T\d+$/.test(column))
            .map((column) => {
                const match = column.match(/^T(\d+)$/);

                return {
                    column,
                    ppt: Number(match![1]),
                };
            })
            .filter(
                ({ ppt }) =>
                    ppt >= pptRange.min &&
                    ppt <= pptRange.max
            )
            .sort((a, b) => a.ppt - b.ppt);

        console.log("\nPPT columns found:");

        for (const item of pptColumns) {
            console.log(
                `  ${item.column} → PPT ${item.ppt} `
            );
        }

        if (pptColumns.length === 0) {
            console.log(
                "❌ No PPT columns from 5-16 were found."
            );
            return;
        }

        let totalInserted = 0;
        let totalSkipped = 0;
        let totalInvalid = 0;

        // -------------------------------------------------------
        // 6. Process every age
        // -------------------------------------------------------

        for (const row of rows) {
            const age = Number(row.Age);

            if (
                row.Age == null ||
                row.Age === "" ||
                !Number.isFinite(age)
            ) {
                console.log(
                    `⚠️ Invalid Age: ${row.Age} `
                );

                totalInvalid++;
                continue;
            }

            // -----------------------------------------------------
            // Policy Term = 100 - Age
            // -----------------------------------------------------

            const policyTerm = 100 - age;

            if (policyTerm <= 0) {
                console.log(
                    `⚠️ Invalid policy term for Age ${age}`
                );

                totalInvalid++;
                continue;
            }

            // -----------------------------------------------------
            // 7. Process each PPT
            // -----------------------------------------------------

            for (const {
                column,
                ppt,
            } of pptColumns) {
                const rawRate = row[column];

                if (
                    rawRate == null ||
                    rawRate === "" ||
                    !Number.isFinite(Number(rawRate))
                ) {
                    totalInvalid++;

                    console.log(
                        `⚠️ Invalid rate | Age ${age} | PPT ${ppt} `
                    );

                    continue;
                }

                const rate = Number(rawRate);

                // Zero means no valid rate
                if (rate === 0) {
                    continue;
                }

                // ---------------------------------------------------
                // 8. Check duplicate
                // ---------------------------------------------------

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

                // ---------------------------------------------------
                // 9. Insert premium rate
                // ---------------------------------------------------

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
        // 10. Final summary
        // -------------------------------------------------------

        console.log("\n==============================================");
        console.log("       PLAN 771 SEEDING COMPLETE");
        console.log("==============================================");

        console.log(`Plan Number: ${planNumber} `);
        console.log(`Product: ${product.productName} `);
        console.log(`Product ID: ${product.id} `);

        console.log("\nPolicy Term:");

        console.log(
            "Policy Term       = 100 - Entry Age"
        );

        console.log("\nPPT Range:");

        console.log(
            "PPT                = 5 - 16"
        );

        console.log("\nPPT Mapping:");

        for (const item of pptColumns) {
            console.log(
                `${item.column.padEnd(18)} → PPT ${item.ppt} `
            );
        }

        console.log("\nResults:");

        console.log(
            `Inserted: ${totalInserted} `
        );

        console.log(
            `Skipped: ${totalSkipped} `
        );

        console.log(
            `Invalid: ${totalInvalid} `
        );

        console.log("==============================================\n");

    } catch (error) {
        console.error(
            `❌ Error while seeding Plan ${planNumber}: `,
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
