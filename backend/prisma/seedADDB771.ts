import { PrismaClient } from "@prisma/client";
import Database from "better-sqlite3";

export async function seedADDB771(prisma: PrismaClient) {
    const db = new Database("./prisma/Creations.db", {
        readonly: true,
    });

    try {
        console.log("🌱 Seeding ADD-B Plan 771...");

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
        // Find Product 771
        // ---------------------------------------------------
        const product = await prisma.productMaster.findFirst({
            where: {
                planNumber: "771",
            },
        });

        if (!product) {
            throw new Error("Product 771 not found");
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
        // Read ADD-B 771 data from SQLite
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
          T15,
          T16
        FROM addb_771
        ORDER BY Term
      `)
            .all() as {
                Term: number;
                T5: number | string | null;
                T6: number | string | null;
                T7: number | string | null;
                T8: number | string | null;
                T9: number | string | null;
                T10: number | string | null;
                T11: number | string | null;
                T12: number | string | null;
                T13: number | string | null;
                T14: number | string | null;
                T15: number | string | null;
                T16: number | string | null;
            }[];

        // ---------------------------------------------------
        // Seed Rider Premium Rates
        // ---------------------------------------------------
        for (const row of rows) {
            const entryAge = row.Term;
            const riderTerm = 100 - entryAge;

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
                { premiumPayingTerm: 16, rate: row.T16 },
            ];

            for (const item of rates) {
                if (item.rate == null) {
                    continue;
                }

                const rate = Number(item.rate);

                if (rate <= 0) {
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
                            ratePerThousand: rate,
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
                            ratePerThousand: rate,
                        },
                    });
                }

                console.log(
                    `✅ Age ${entryAge} | Rider Term ${riderTerm} | PPT ${item.premiumPayingTerm} | Rate ${rate}`
                );
            }
        }

        console.log("✅ ADD-B Plan 771 seeded successfully");
    } finally {
        db.close();
    }
}