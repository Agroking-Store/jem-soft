import { PrismaClient } from "@prisma/client";
import Database from "better-sqlite3";

export async function seedADDB881(prisma: PrismaClient) {
    const db = new Database("./prisma/Creations.db", {
        readonly: true,
    });

    try {
        console.log("🌱 Seeding ADD-B Plan 881...");

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
        // Find Product 881
        // ---------------------------------------------------
        const product = await prisma.productMaster.findFirst({
            where: {
                planNumber: "881",
            },
        });

        if (!product) {
            throw new Error("Product 881 not found");
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
        // Read ADD-B 881 data from SQLite
        // ---------------------------------------------------
        const rows = db
            .prepare(`
        SELECT
          Term,
          T5,
          T6,
          T7,
          T8,
          T9,
          T10,
          T11,
          T12,
          T13,
          T14,
          T15
        FROM addb_881
        ORDER BY Term
      `)
            .all() as {
                Term: number;
                T5: number | null;
                T6: number | null;
                T7: number | null;
                T8: number | null;
                T9: number | null;
                T10: number | null;
                T11: number | null;
                T12: number | null;
                T13: number | null;
                T14: number | null;
                T15: number | null;
            }[];

        // ---------------------------------------------------
        // Clean existing ADDB rates for Product 881
        // ---------------------------------------------------
        await prisma.riderPremiumRate.deleteMany({
            where: {
                riderId: addbRider.id,
                productId: product.id,
            },
        });

        // ---------------------------------------------------
        // Seed Rider Premium Rates
        // ---------------------------------------------------
        for (const row of rows) {
            const riderTerm = Number(row.Term);
            const entryAge = 0;

            const rates = [
                { premiumPayingTerm: 5, rate: row.T5 },
                { premiumPayingTerm: 6, rate: row.T6 },
                { premiumPayingTerm: 7, rate: row.T7 },
                { premiumPayingTerm: 8, rate: row.T8 },
                { premiumPayingTerm: 9, rate: row.T9 },
                { premiumPayingTerm: 10, rate: row.T10 },
                { premiumPayingTerm: 11, rate: row.T11 },
                { premiumPayingTerm: 12, rate: row.T12 },
                { premiumPayingTerm: 13, rate: row.T13 },
                { premiumPayingTerm: 14, rate: row.T14 },
                { premiumPayingTerm: 15, rate: row.T15 },
            ];

            for (const item of rates) {
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
                        entryAge,
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
                            entryAge,
                            riderTerm,
                            premiumPayingTerm: item.premiumPayingTerm,
                            option: null,
                            gender: null,
                            ratePerThousand: item.rate,
                        },
                    });
                }

                console.log(
                    `✅ Age ${entryAge} | Rider Term ${riderTerm} | PPT ${item.premiumPayingTerm} | Rate ${item.rate}`
                );
            }
        }

        console.log("✅ ADD-B Plan 881 seeded successfully");
    } finally {
        db.close();
    }
}