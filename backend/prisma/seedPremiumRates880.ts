import { PrismaClient } from "@prisma/client";
import Database from "better-sqlite3";

export const seedPremiumRates880 = async (prisma: PrismaClient) => {
    const sqlite = new Database("./prisma/Creations.db", {
        readonly: true,
    });

    const planNumber = "880";

    try {
        // Find Plan 880 product
        const product = await prisma.productMaster.findFirst({
            where: {
                planNumber,
            },
        });

        if (!product) {
            console.log(`❌ Plan ${planNumber} not found`);
            return;
        }

        console.log(
            `Matched Product: ${product.productName} (${product.planNumber})`
        );

        // table_880 contains:
        // T12 -> Policy Term 12, PPT 7
        // T13 -> Policy Term 13, PPT 8
        // ...
        // T20 -> Policy Term 20, PPT 15

        const termPptMap: Record<number, number> = {
            12: 7,
            13: 8,
            14: 9,
            15: 10,
            16: 11,
            17: 12,
            18: 13,
            19: 14,
            20: 15,
        };

        const tableName = "table_880";

        const rows = sqlite
            .prepare(`SELECT * FROM "${tableName}"`)
            .all() as any[];

        console.log(`Found ${rows.length} rows in ${tableName}`);

        let inserted = 0;
        let skipped = 0;

        for (const row of rows) {
            const entryAge = Number(row.Age);

            if (Number.isNaN(entryAge)) {
                continue;
            }

            for (const [term, ppt] of Object.entries(termPptMap)) {
                const policyTerm = Number(term);
                const column = `T${policyTerm}`;

                const rate = Number(row[column]);

                if (
                    row[column] == null ||
                    row[column] === "" ||
                    Number.isNaN(rate) ||
                    rate === 0
                ) {
                    continue;
                }

                const existing =
                    await prisma.productPremiumRate.findFirst({
                        where: {
                            productId: product.id,
                            entryAge,
                            secondaryAge: null,
                            policyTerm,
                            premiumPayingTerm: ppt,
                            option: null,
                        },
                    });

                if (existing) {
                    skipped++;
                    continue;
                }

                await prisma.productPremiumRate.create({
                    data: {
                        productId: product.id,
                        entryAge,
                        secondaryAge: null,
                        policyTerm,
                        premiumPayingTerm: ppt,
                        option: null,
                        tabularRate: rate,
                    },
                });

                inserted++;

                console.log(
                    `Inserted → Age ${entryAge}, Term ${policyTerm}, PPT ${ppt}, Rate ${rate}`
                );
            }
        }

        console.log("\n=================================");
        console.log(`✔ Plan       : ${product.planNumber}`);
        console.log(`✔ Product    : ${product.productName}`);
        console.log(`✔ Table      : ${tableName}`);
        console.log(`✔ Inserted   : ${inserted}`);
        console.log(`✔ Skipped    : ${skipped}`);
        console.log("=================================");
    } catch (error) {
        console.error(`❌ Error seeding Plan ${planNumber}:`, error);
    } finally {
        sqlite.close();
    }
};