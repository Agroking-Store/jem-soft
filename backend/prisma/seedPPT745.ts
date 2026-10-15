import { PrismaClient } from "@prisma/client";
import Database from "better-sqlite3";

export const seedPPT745 = async (prisma: PrismaClient) => {
    const sqlite = new Database("./prisma/Creations.db", {
        readonly: true,
    });

    const planNumber = "745";

    /**
     * LIC PLAN 745
     *
     * SQLite table:
     *   table_745
     *
     * Columns:
     *   Age
     *   T15
     *   T20
     *   T25
     *   T30
     *
     * Meaning:
     *   T15 -> PPT 15
     *   T20 -> PPT 20
     *   T25 -> PPT 25
     *   T30 -> PPT 30
     *
     * Policy Term:
     *   100 - Age
     *
     * Example:
     *   Age 30 -> Policy Term 70
     *   Age 40 -> Policy Term 60
     *   Age 50 -> Policy Term 50
     */

    const pptColumns = [
        {
            column: "T15",
            premiumPayingTerm: 15,
        },
        {
            column: "T20",
            premiumPayingTerm: 20,
        },
        {
            column: "T25",
            premiumPayingTerm: 25,
        },
        {
            column: "T30",
            premiumPayingTerm: 30,
        },
    ] as const;

    try {
        console.log("\n==============================================");
        console.log("       PLAN 745 PPT PREMIUM SEEDER");
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
        // 2. Check SQLite table
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
            .get("table_745");

        if (!tableExists) {
            console.log("❌ table_745 not found in SQLite DB");
            return;
        }

        // -------------------------------------------------------
        // 3. Read premium data
        // -------------------------------------------------------

        const rows = sqlite
            .prepare(
                `
        SELECT Age, T15, T20, T25, T30
        FROM table_745
        `
            )
            .all() as Record<string, unknown>[];

        console.log(`✔ Rows found in table_745: ${rows.length}`);

        let totalInserted = 0;
        let totalSkipped = 0;
        let totalInvalid = 0;

        // -------------------------------------------------------
        // 4. Process each age
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
            // 5. Process PPT columns
            // -----------------------------------------------------

            for (const {
                column,
                premiumPayingTerm,
            } of pptColumns) {
                const rawRate = row[column];

                if (
                    rawRate == null ||
                    rawRate === "" ||
                    !Number.isFinite(Number(rawRate))
                ) {
                    totalInvalid++;

                    console.log(
                        `⚠️ Invalid rate | Age ${age} | PPT ${premiumPayingTerm}`
                    );

                    continue;
                }

                const rate = Number(rawRate);

                // Zero means no valid premium
                if (rate === 0) {
                    continue;
                }

                // ---------------------------------------------------
                // 6. Check duplicate
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

                            premiumPayingTerm,

                            option: null,
                        },
                    });

                if (existing) {
                    totalSkipped++;
                    continue;
                }

                // ---------------------------------------------------
                // 7. Insert
                // ---------------------------------------------------

                await prisma.productPremiumRate.create({
                    data: {
                        productId: product.id,

                        entryAge: age,

                        secondaryAge: null,

                        gender: null,

                        smoker: null,

                        policyTerm,

                        premiumPayingTerm,

                        option: null,

                        tabularRate: rate,
                    },
                });

                totalInserted++;
            }
        }

        // -------------------------------------------------------
        // 8. Summary
        // -------------------------------------------------------

        console.log("\n==============================================");
        console.log("       PLAN 745 SEEDING COMPLETE");
        console.log("==============================================");

        console.log(`Plan Number       : ${planNumber}`);
        console.log(`Product           : ${product.productName}`);
        console.log(`Product ID        : ${product.id}`);

        console.log("\nPPT Mapping:");

        console.log("T15               → PPT 15");
        console.log("T20               → PPT 20");
        console.log("T25               → PPT 25");
        console.log("T30               → PPT 30");

        console.log("\nPolicy Term:");

        console.log("Policy Term       = 100 - Entry Age");

        console.log("\nResults:");

        console.log(`Inserted          : ${totalInserted}`);
        console.log(`Skipped           : ${totalSkipped}`);
        console.log(`Invalid           : ${totalInvalid}`);

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
