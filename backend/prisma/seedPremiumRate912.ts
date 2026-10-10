import { PrismaClient } from "@prisma/client";
import Database from "better-sqlite3";

const prisma = new PrismaClient();

/**
 * ============================================================
 * LIC PLAN 912 - PREMIUM RATE SEED
 * ============================================================
 *
 * SQLite tables:
 *
 *   table_912_1 -> Option 1
 *   table_912_2 -> Option 2
 *
 * Term / PPT combinations:
 *
 * PPT 6:
 *   10_6, 11_6, 12_6, 13_6, 14_6,
 *   15_6, 16_6, 17_6, 18_6, 19_6, 20_6
 *
 * PPT 8:
 *   15_8, 16_8, 17_8, 18_8, 19_8, 20_8
 *
 * PPT 10:
 *   15_10, 16_10, 17_10, 18_10, 19_10, 20_10
 *
 * PPT 12:
 *   16_12, 17_12, 18_12, 19_12, 20_12
 *
 * PPT 15:
 *   18_15, 19_15, 20_15
 *
 * ============================================================
 */

const PLAN_NUMBER = "912";

const TABLES = [
    {
        tableName: "table_912_1",
        option: 1,
    },
    {
        tableName: "table_912_2",
        option: 2,
    },
];

/**
 * Allowed Policy Term / Premium Paying Term combinations.
 */
const ALLOWED_TERM_PPT = [
    // ---------------------------------------------------------
    // PPT 6
    // ---------------------------------------------------------
    { policyTerm: 10, premiumPayingTerm: 6 },
    { policyTerm: 11, premiumPayingTerm: 6 },
    { policyTerm: 12, premiumPayingTerm: 6 },
    { policyTerm: 13, premiumPayingTerm: 6 },
    { policyTerm: 14, premiumPayingTerm: 6 },
    { policyTerm: 15, premiumPayingTerm: 6 },
    { policyTerm: 16, premiumPayingTerm: 6 },
    { policyTerm: 17, premiumPayingTerm: 6 },
    { policyTerm: 18, premiumPayingTerm: 6 },
    { policyTerm: 19, premiumPayingTerm: 6 },
    { policyTerm: 20, premiumPayingTerm: 6 },

    // ---------------------------------------------------------
    // PPT 8
    // ---------------------------------------------------------
    { policyTerm: 15, premiumPayingTerm: 8 },
    { policyTerm: 16, premiumPayingTerm: 8 },
    { policyTerm: 17, premiumPayingTerm: 8 },
    { policyTerm: 18, premiumPayingTerm: 8 },
    { policyTerm: 19, premiumPayingTerm: 8 },
    { policyTerm: 20, premiumPayingTerm: 8 },

    // ---------------------------------------------------------
    // PPT 10
    // ---------------------------------------------------------
    { policyTerm: 15, premiumPayingTerm: 10 },
    { policyTerm: 16, premiumPayingTerm: 10 },
    { policyTerm: 17, premiumPayingTerm: 10 },
    { policyTerm: 18, premiumPayingTerm: 10 },
    { policyTerm: 19, premiumPayingTerm: 10 },
    { policyTerm: 20, premiumPayingTerm: 10 },

    // ---------------------------------------------------------
    // PPT 12
    // ---------------------------------------------------------
    { policyTerm: 16, premiumPayingTerm: 12 },
    { policyTerm: 17, premiumPayingTerm: 12 },
    { policyTerm: 18, premiumPayingTerm: 12 },
    { policyTerm: 19, premiumPayingTerm: 12 },
    { policyTerm: 20, premiumPayingTerm: 12 },

    // ---------------------------------------------------------
    // PPT 15
    // ---------------------------------------------------------
    { policyTerm: 18, premiumPayingTerm: 15 },
    { policyTerm: 19, premiumPayingTerm: 15 },
    { policyTerm: 20, premiumPayingTerm: 15 },
];

/**
 * ============================================================
 * SEED FUNCTION
 * ============================================================
 *
 * Seeds LIC Plan 912 premium rates from:
 *
 *   table_912_1 -> option 1
 *   table_912_2 -> option 2
 *
 * The Prisma client can be passed from another seed file.
 */
export async function seedPlan912PremiumRates(
    prismaClient: PrismaClient = prisma
) {
    const sqlite = new Database("./prisma/Creations.db", {
        readonly: true,
    });

    try {
        console.log("");
        console.log("==============================================");
        console.log("   LIC PLAN 912 PREMIUM RATE SEED");
        console.log("==============================================");

        // =====================================================
        // 1. FIND PRODUCT
        // =====================================================

        const product = await prismaClient.productMaster.findFirst({
            where: {
                planNumber: PLAN_NUMBER,
            },
        });

        if (!product) {
            throw new Error(
                `Plan ${PLAN_NUMBER} not found in ProductMaster`
            );
        }

        console.log("");
        console.log(`Product     : ${product.productName}`);
        console.log(`Plan Number : ${product.planNumber}`);
        console.log(`Product ID  : ${product.id}`);

        // =====================================================
        // 2. COUNTERS
        // =====================================================

        let inserted = 0;
        let skipped = 0;
        let ignored = 0;

        // =====================================================
        // 3. PROCESS BOTH OPTIONS
        // =====================================================

        for (const { tableName, option } of TABLES) {
            console.log("");
            console.log("----------------------------------------------");
            console.log(
                `Processing ${tableName} | Option ${option}`
            );
            console.log("----------------------------------------------");

            // -------------------------------------------------
            // Read SQLite table
            // -------------------------------------------------

            const premiumRows = sqlite
                .prepare(`SELECT * FROM "${tableName}"`)
                .all() as Record<string, unknown>[];

            console.log(
                `Rows found: ${premiumRows.length}`
            );

            if (premiumRows.length === 0) {
                console.log(
                    `No data found in ${tableName}`
                );
                continue;
            }

            // =================================================
            // 4. PROCESS EACH AGE
            // =================================================

            for (const row of premiumRows) {
                const entryAge = Number(row.Age);

                if (!Number.isFinite(entryAge)) {
                    console.warn(
                        `Skipping invalid Age in ${tableName}:`,
                        row.Age
                    );

                    ignored++;
                    continue;
                }

                // =================================================
                // 5. PROCESS ALLOWED TERM / PPT
                // =================================================

                for (const {
                    policyTerm,
                    premiumPayingTerm,
                } of ALLOWED_TERM_PPT) {
                    const columnName =
                        `T${policyTerm}_${premiumPayingTerm}`;

                    // -------------------------------------------------
                    // Make sure the column exists
                    // -------------------------------------------------

                    if (!(columnName in row)) {
                        ignored++;
                        continue;
                    }

                    const rate = row[columnName];

                    // -------------------------------------------------
                    // Ignore invalid rates
                    // -------------------------------------------------

                    if (
                        rate == null ||
                        rate === "" ||
                        Number(rate) === 0 ||
                        !Number.isFinite(Number(rate))
                    ) {
                        ignored++;
                        continue;
                    }

                    const numericRate = Number(rate);

                    // =================================================
                    // 6. CHECK EXISTING RECORD
                    // =================================================
                    //
                    // IMPORTANT:
                    // option is included here so Option 1 and
                    // Option 2 are treated as separate records.
                    //
                    // =================================================

                    const existing =
                        await prismaClient.productPremiumRate.findFirst({
                            where: {
                                productId: product.id,
                                entryAge,
                                policyTerm,
                                premiumPayingTerm,
                                option,
                            },
                        });

                    if (existing) {
                        skipped++;
                        continue;
                    }

                    // =================================================
                    // 7. CREATE PREMIUM RATE
                    // =================================================

                    await prismaClient.productPremiumRate.create({
                        data: {
                            productId: product.id,
                            entryAge,
                            policyTerm,
                            premiumPayingTerm,
                            option,
                            tabularRate: numericRate,
                        },
                    });

                    inserted++;

                    console.log(
                        `Inserted | Option ${option} | Age ${entryAge} | ` +
                        `Term ${policyTerm} | PPT ${premiumPayingTerm} | ` +
                        `Rate ${numericRate}`
                    );
                }
            }

            console.log(
                `Completed ${tableName} | Option ${option}`
            );
        }

        // =====================================================
        // 8. FINAL SUMMARY
        // =====================================================

        console.log("");
        console.log("==============================================");
        console.log("   PLAN 912 SEEDING COMPLETED");
        console.log("==============================================");
        console.log(`Product     : ${product.productName}`);
        console.log(`Plan Number : ${product.planNumber}`);
        console.log(`Inserted    : ${inserted}`);
        console.log(`Skipped     : ${skipped}`);
        console.log(`Ignored     : ${ignored}`);
        console.log("==============================================");
        console.log("");

        return {
            productId: product.id,
            planNumber: product.planNumber,
            inserted,
            skipped,
            ignored,
        };
    } finally {
        // =====================================================
        // 9. CLOSE SQLITE
        // =====================================================

        sqlite.close();
    }
}
