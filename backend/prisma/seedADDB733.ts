import { PrismaClient } from "@prisma/client";
import Database from "better-sqlite3";


export async function seedADDB733(prisma: PrismaClient) {
    const db = new Database("./prisma/Creations.db", {
        readonly: true,
    });

    try {
        console.log("🌱 Seeding ADDB Plan 733 - AB_DB only...");

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
        // Find Product 733
        // ---------------------------------------------------
        const product = await prisma.productMaster.findFirst({
            where: {
                planNumber: "733",
            },
        });

        if (!product) {
            throw new Error("Product with plan number 733 not found");
        }

        // ---------------------------------------------------
        // Link Plan 733 to ADDB and TERM riders in ProductRider
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
        console.log(`✔ Linked Plan 733 to ADDB rider in ProductRider`);

        const termRider = await prisma.riderMaster.findFirst({
            where: { riderCode: "TERM" },
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
            console.log(`✔ Linked Plan 733 to TERM rider in ProductRider`);
        }

        // ---------------------------------------------------
        // Read SQLite source table
        // ---------------------------------------------------
        const rows = db
            .prepare(`
                SELECT Term, AB_DB
                FROM addb_733
                ORDER BY Term
            `)
            .all() as {
                Term: number;
                AB_DB: number;
            }[];

        console.log(`📊 Found ${rows.length} ADD-B 733 rows`);

        let inserted = 0;
        let skipped = 0;

        // ---------------------------------------------------
        // Seed AB_DB only
        // ---------------------------------------------------
        for (const row of rows) {
            const riderTerm = Number(row.Term);
            const rate = Number(row.AB_DB);

            if (
                !riderTerm ||
                rate === null ||
                rate === undefined ||
                rate <= 0
            ) {
                skipped++;
                continue;
            }

            // ---------------------------------------------------
            // Find existing rate
            // ---------------------------------------------------
            const existingRate = await prisma.riderPremiumRate.findFirst({
                where: {
                    riderId: rider.id,
                    productId: product.id,
                    entryAge: 0,
                    riderTerm,
                    premiumPayingTerm: null,
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
                        premiumPayingTerm: null,
                        option: null,
                        gender: null,
                        ratePerThousand: rate,
                    },
                });
            }

            inserted++;

            console.log(
                `✅ Term ${riderTerm} | AB_DB | Rate ${rate}`
            );
        }

        console.log("\n-----------------------------------");
        console.log("ADD-B 733 AB_DB seeding completed");
        console.log("-----------------------------------");
        console.log(`Inserted/Updated : ${inserted}`);
        console.log(`Skipped          : ${skipped}`);
        console.log("-----------------------------------");

    } finally {
        db.close();
        await prisma.$disconnect();
    }
}