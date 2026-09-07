import { PrismaClient } from "@prisma/client";
import Database from "better-sqlite3";

export const seedPremiumRates887 = async (
    prisma: PrismaClient
) => {
    const sqlite = new Database("./prisma/Creations.db", {
        readonly: true,
    });

    const planNumber = "887";

    try {
        console.log("\n==============================================");
        console.log("       PLAN 887 PREMIUM SEEDER");
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

        console.log(`✔ Product     : ${product.productName}`);
        console.log(`✔ Product ID  : ${product.id}`);

        // -------------------------------------------------------
        // 2. Get all Plan 887 tables
        // -------------------------------------------------------

        const tables = sqlite
            .prepare(
                `
                SELECT name
                FROM sqlite_master
                WHERE type = 'table'
                  AND name LIKE 'table_887_%'
                ORDER BY name
                `
            )
            .all() as { name: string }[];

        console.log(`✔ Tables found : ${tables.length}`);

        let totalInserted = 0;
        let totalSkipped = 0;
        let totalInvalid = 0;

        // -------------------------------------------------------
        // 3. Process every table
        // -------------------------------------------------------

        for (const { name: tableName } of tables) {

            /*
             * Expected formats:
             *
             * table_887_M_NS_LS_RP
             * table_887_M_NS_LS_SP
             * table_887_M_NS_LS_LP_5
             * table_887_M_NS_LS_LP_10
             * table_887_M_NS_LS_LP_15
             *
             * table_887_F_S_IS_RP
             * etc.
             */

            const match = tableName.match(
                /^table_887_(M|F)_(NS|S)_(LS|IS)_(RP|SP|LP_(5|10|15))$/
            );

            if (!match) {
                console.log(
                    `⚠️ Skipping unknown table format: ${tableName}`
                );
                continue;
            }

            const gender = match[1];
            const smokerCode = match[2];
            const optionCode = match[3];
            const premiumType = match[4];

            // ---------------------------------------------------
            // Gender / Smoker
            // ---------------------------------------------------

            const smoker = smokerCode === "S";

            // ---------------------------------------------------
            // Option
            //
            // LS = Option 1
            // IS = Option 2
            // ---------------------------------------------------

            const option =
                optionCode === "LS"
                    ? 1
                    : 2;

            // ---------------------------------------------------
            // Determine PPT
            // ---------------------------------------------------

            let fixedPPT: number | null = null;

            switch (premiumType) {
                case "SP":
                    fixedPPT = 1;
                    break;

                case "LP_5":
                    fixedPPT = 5;
                    break;

                case "LP_10":
                    fixedPPT = 10;
                    break;

                case "LP_15":
                    fixedPPT = 15;
                    break;

                case "RP":
                    fixedPPT = null;
                    break;
            }

            console.log("\n----------------------------------------------");
            console.log(`Table       : ${tableName}`);
            console.log(`Gender      : ${gender}`);
            console.log(`Smoker      : ${smoker}`);
            console.log(`Option      : ${option}`);
            console.log(`Type        : ${premiumType}`);

            if (premiumType === "RP") {
                console.log(
                    `PPT         : Policy Term (100 - Age)`
                );
            } else {
                console.log(`PPT         : ${fixedPPT}`);
            }

            // ---------------------------------------------------
            // 4. Verify table exists
            // ---------------------------------------------------

            const tableExists = sqlite
                .prepare(
                    `
                    SELECT name
                    FROM sqlite_master
                    WHERE type = 'table'
                      AND name = ?
                    `
                )
                .get(tableName);

            if (!tableExists) {
                console.log(
                    `⚠️ Table not found: ${tableName}`
                );
                continue;
            }

            // ---------------------------------------------------
            // 5. Read table structure
            // ---------------------------------------------------

            const columns = sqlite
                .prepare(
                    `PRAGMA table_info("${tableName}")`
                )
                .all() as {
                    name: string;
                    type: string;
                }[];

            const columnNames = columns.map(
                (column) => column.name
            );

            // ---------------------------------------------------
            // 6. Read rows
            // ---------------------------------------------------

            const rows = sqlite
                .prepare(
                    `SELECT * FROM "${tableName}"`
                )
                .all() as Record<string, unknown>[];

            console.log(`Rows        : ${rows.length}`);

            if (rows.length === 0) {
                continue;
            }

            let inserted = 0;
            let skipped = 0;
            let invalid = 0;

            // ---------------------------------------------------
            // 7. Process every age
            // ---------------------------------------------------

            for (const row of rows) {

                // ------------------------------------------------
                // Age
                // ------------------------------------------------

                if (
                    row.Age == null ||
                    row.Age === ""
                ) {
                    invalid++;
                    continue;
                }

                const age = Number(row.Age);

                if (!Number.isFinite(age)) {
                    invalid++;
                    continue;
                }

                // ------------------------------------------------
                // Plan 887
                //
                // Policy Term = 100 - Entry Age
                // ------------------------------------------------

                const policyTerm = 100 - age;

                if (
                    policyTerm < 10 ||
                    policyTerm > 82
                ) {
                    continue;
                }

                // ------------------------------------------------
                // Determine PPT
                // ------------------------------------------------

                let premiumPayingTerm: number;

                if (premiumType === "RP") {
                    premiumPayingTerm = policyTerm;
                } else {
                    premiumPayingTerm = fixedPPT!;
                }

                // ------------------------------------------------
                // Find premium column
                //
                // Plan 887 has mixed formats:
                //
                // T10, T11, T12...
                //
                // AND
                //
                // 10, 11, 12...
                //
                // Therefore check both.
                // ------------------------------------------------

                const tColumn = `T${policyTerm}`;
                const numericColumn = `${policyTerm}`;

                let premiumColumn: string | null = null;

                if (columnNames.includes(tColumn)) {
                    premiumColumn = tColumn;
                } else if (
                    columnNames.includes(numericColumn)
                ) {
                    premiumColumn = numericColumn;
                }

                // ------------------------------------------------
                // Column not found
                // ------------------------------------------------

                if (!premiumColumn) {
                    console.log(
                        `⚠️ ${tableName}: Term ${policyTerm} not found as ${tColumn} or ${numericColumn}`
                    );

                    invalid++;
                    continue;
                }

                // ------------------------------------------------
                // Get raw rate
                // ------------------------------------------------

                const rawRate = row[premiumColumn];

                if (
                    rawRate == null ||
                    rawRate === "" ||
                    typeof rawRate === "object"
                ) {
                    invalid++;
                    continue;
                }

                const rate = Number(rawRate);

                if (!Number.isFinite(rate)) {
                    invalid++;
                    continue;
                }

                // ------------------------------------------------
                // Zero means no valid premium
                // ------------------------------------------------

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

                            gender,

                            smoker,

                            policyTerm,

                            premiumPayingTerm,

                            option,
                        },
                    });

                if (existing) {
                    skipped++;
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

                        gender,

                        smoker,

                        policyTerm,

                        premiumPayingTerm,

                        option,

                        tabularRate: rate,
                    },
                });

                inserted++;
            }

            // ---------------------------------------------------
            // Table Summary
            // ---------------------------------------------------

            totalInserted += inserted;
            totalSkipped += skipped;
            totalInvalid += invalid;

            console.log(`Inserted    : ${inserted}`);
            console.log(`Skipped     : ${skipped}`);
            console.log(`Invalid     : ${invalid}`);
        }

        // -------------------------------------------------------
        // Final Summary
        // -------------------------------------------------------

        console.log("\n==============================================");
        console.log("       PLAN 887 SEEDING COMPLETE");
        console.log("==============================================");

        console.log(
            `Plan Number : ${product.planNumber}`
        );

        console.log(
            `Product     : ${product.productName}`
        );

        console.log(
            `Tables      : ${tables.length}`
        );

        console.log(
            `Inserted    : ${totalInserted}`
        );

        console.log(
            `Skipped     : ${totalSkipped}`
        );

        console.log(
            `Invalid     : ${totalInvalid}`
        );

        console.log("\nOption Mapping:");
        console.log("LS = Option 1");
        console.log("IS = Option 2");

        console.log("\nPPT Mapping:");
        console.log("SP    = 1");
        console.log("LP_5  = 5");
        console.log("LP_10 = 10");
        console.log("LP_15 = 15");
        console.log("RP    = Policy Term (100 - Age)");

        console.log("\nTerm Column Mapping:");
        console.log("T10, T11, T12... → Supported");
        console.log("10, 11, 12...    → Supported");

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
