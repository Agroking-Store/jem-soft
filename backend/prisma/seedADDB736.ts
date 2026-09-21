import { PrismaClient } from "@prisma/client";
import Database from "better-sqlite3";

export async function seedADDB736(prisma: PrismaClient) {
    const db = new Database("./prisma/Creations.db", {
        readonly: true,
    });

    try {
        console.log("🌱 Seeding ADDB Plan 736...");

        // ---------------------------------------------------
        // Find ADD-B rider
        // ---------------------------------------------------
        const rider = await prisma.riderMaster.findFirst({
            where: {
                riderCode: "ADDB",
            },
        });

        if (!rider) {
            throw new Error("ADDB rider not found in RiderMaster");
        }

        // ---------------------------------------------------
        // Find Product 736
        // ---------------------------------------------------
        const product = await prisma.productMaster.findFirst({
            where: {
                planNumber: "736",
            },
        });

        if (!product) {
            throw new Error("Product with plan number 736 not found");
        }

        // ---------------------------------------------------
        // Link Plan 736 to ADDB and TERM riders in ProductRider
        // ---------------------------------------------------
        await prisma.productRider.upsert({
            where: {
                productId_riderId: {
                    productId: product.id,
                    riderId: rider.id,
                },
            },
            update: {},
            create: {
                productId: product.id,
                riderId: rider.id,
            },
        });

        console.log(`✔ Linked Plan 736 to ADDB rider in ProductRider`);

        const termRider = await prisma.riderMaster.findFirst({
            where: {
                riderCode: "TERM",
            },
        });

        if (termRider) {
            await prisma.productRider.upsert({
                where: {
                    productId_riderId: {
                        productId: product.id,
                        riderId: termRider.id,
                    },
                },
                update: {},
                create: {
                    productId: product.id,
                    riderId: termRider.id,
                },
            });

            console.log(`✔ Linked Plan 736 to TERM rider in ProductRider`);
        }

        // ---------------------------------------------------
        // Read SQLite source table
        // Only addb_736 - NOT addb_736_c2
        // ---------------------------------------------------
        const rows = db
            .prepare(`
                SELECT Term, T10, T15, T16
                FROM addb_736
                WHERE Term IN (16, 21, 25)
                ORDER BY Term
            `)
            .all() as {
                Term: number;
                T10: number | null;
                T15: number | null;
                T16: number | null;
            }[];

        console.log(`📊 Found ${rows.length} ADD-B 736 rows`);

        let inserted = 0;
        let skipped = 0;

        // ---------------------------------------------------
        // Seed selected Plan Terms and PPTs
        // Plan Terms: 16, 21, 25
        // PPTs: 10, 15, 16
        // ---------------------------------------------------
        for (const row of rows) {
            const riderTerm = Number(row.Term);

            const pptRates = [
                {
                    premiumPayingTerm: 10,
                    rate: row.T10,
                },
                {
                    premiumPayingTerm: 15,
                    rate: row.T15,
                },
                {
                    premiumPayingTerm: 16,
                    rate: row.T16,
                },
            ];

            for (const item of pptRates) {
                const premiumPayingTerm = item.premiumPayingTerm;
                const rate = item.rate;

                if (
                    !riderTerm ||
                    rate === null ||
                    rate === undefined ||
                    Number(rate) <= 0
                ) {
                    skipped++;
                    continue;
                }

                // ---------------------------------------------------
                // Find existing rate
                // ---------------------------------------------------
                const existingRate =
                    await prisma.riderPremiumRate.findFirst({
                        where: {
                            riderId: rider.id,
                            productId: product.id,
                            entryAge: 0,
                            riderTerm,
                            premiumPayingTerm,
                            option: null,
                            gender: null,
                        },
                    });

                // ---------------------------------------------------
                // Update existing / create new
                // ---------------------------------------------------
                if (existingRate) {
                    await prisma.riderPremiumRate.update({
                        where: {
                            id: existingRate.id,
                        },
                        data: {
                            ratePerThousand: rate,
                        },
                    });
                } else {
                    await prisma.riderPremiumRate.create({
                        data: {
                            riderId: rider.id,
                            productId: product.id,
                            entryAge: 0,
                            riderTerm,
                            premiumPayingTerm,
                            option: null,
                            gender: null,
                            ratePerThousand: rate,
                        },
                    });
                }

                inserted++;

                console.log(
                    `✅ Term ${riderTerm} | PPT ${premiumPayingTerm} | Rate ${rate}`
                );
            }
        }

        console.log("\n-----------------------------------");
        console.log("ADD-B 736 seeding completed");
        console.log("-----------------------------------");
        console.log(`Inserted/Updated : ${inserted}`);
        console.log(`Skipped          : ${skipped}`);
        console.log("-----------------------------------");

    } finally {
        db.close();
    }
}