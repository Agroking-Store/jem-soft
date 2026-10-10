import { PrismaClient } from "@prisma/client";
import Database from "better-sqlite3";

export async function seedADDB745(prisma: PrismaClient) {
    const db = new Database("./prisma/Creations.db", {
        readonly: true,
    });

    try {
        console.log("🌱 Seeding ADD-B Plan 745...");

        // ---------------------------------------------------
        // Find ADDB Rider
        // ---------------------------------------------------
        const addbRider = await prisma.riderMaster.findUnique({
            where: {
                riderCode: "ADDB",
            },
        });

        if (!addbRider) {
            throw new Error("ADDB rider not found");
        }

        // ---------------------------------------------------
        // Find Product 745
        // ---------------------------------------------------
        const product = await prisma.productMaster.findFirst({
            where: {
                planNumber: "745",
            },
        });

        if (!product) {
            throw new Error("Product 745 not found");
        }

        // ---------------------------------------------------
        // Link ADDB Rider with Product
        // ---------------------------------------------------
        await prisma.productRider.upsert({
            where: {
                productId_riderId: {
                    productId: product.id,
                    riderId: addbRider.id,
                },
            },
            update: {},
            create: {
                productId: product.id,
                riderId: addbRider.id,
            },
        });

        // ---------------------------------------------------
        // Find TERM Rider
        // ---------------------------------------------------
        const termRider = await prisma.riderMaster.findUnique({
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
        }

        // ---------------------------------------------------
        // Read ADD-B 745 data from SQLite
        // ---------------------------------------------------
        const rows = db
            .prepare(`
        SELECT
          Age,
          T15,
          T20,
          T25,
          T30
        FROM addb_745
        ORDER BY Age
      `)
            .all() as {
                Age: number;
                T15: number | null;
                T20: number | null;
                T25: number | null;
                T30: number | null;
            }[];

        // ---------------------------------------------------
        // Seed Rider Premium Rates
        // ---------------------------------------------------
        for (const row of rows) {
            const riderTerm = 100 - row.Age;

            const rates = [
                {
                    premiumPayingTerm: 15,
                    rate: row.T15,
                },
                {
                    premiumPayingTerm: 20,
                    rate: row.T20,
                },
                {
                    premiumPayingTerm: 25,
                    rate: row.T25,
                },
                {
                    premiumPayingTerm: 30,
                    rate: row.T30,
                },
            ];

            for (const item of rates) {
                // Skip unavailable rates
                if (item.rate == null || item.rate <= 0) {
                    continue;
                }

                // ---------------------------------------------------
                // Check existing rate
                // ---------------------------------------------------
                const existing = await prisma.riderPremiumRate.findFirst({
                    where: {
                        riderId: addbRider.id,
                        productId: product.id,
                        entryAge: row.Age,
                        riderTerm,
                        premiumPayingTerm: item.premiumPayingTerm,
                        option: null,
                        gender: null,
                    },
                });

                if (existing) {
                    await prisma.riderPremiumRate.update({
                        where: {
                            id: existing.id,
                        },
                        data: {
                            ratePerThousand: item.rate,
                        },
                    });
                } else {
                    await prisma.riderPremiumRate.create({
                        data: {
                            riderId: addbRider.id,
                            productId: product.id,
                            entryAge: row.Age,
                            riderTerm,
                            premiumPayingTerm: item.premiumPayingTerm,
                            option: null,
                            gender: null,
                            ratePerThousand: item.rate,
                        },
                    });
                }

                console.log(
                    `✅ Age ${row.Age} | Rider Term ${riderTerm} | PPT ${item.premiumPayingTerm} | Rate ${item.rate}`
                );
            }
        }

        console.log("✅ ADD-B Plan 745 seeded successfully");
    } finally {
        db.close();
    }
}