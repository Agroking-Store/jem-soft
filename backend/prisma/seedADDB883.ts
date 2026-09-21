import { PrismaClient } from "@prisma/client";
import Database from "better-sqlite3";

export async function seedADDB883(prisma: PrismaClient) {
    const db = new Database("./prisma/Creations.db", {
        readonly: true,
    });

    try {
        console.log("🌱 Seeding ADD-B Plan 883...");

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
        // Find Product 883
        // ---------------------------------------------------
        const product = await prisma.productMaster.findFirst({
            where: {
                planNumber: "883",
            },
        });

        if (!product) {
            throw new Error("Product 883 not found");
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
        // Read ADD-B 883 data from SQLite
        // ---------------------------------------------------
        const rows = db
            .prepare(`
        SELECT
          Term,
          T1
        FROM addb_883
        ORDER BY Term
      `)
            .all() as {
                Term: number;
                T1: number | null;
            }[];

        // ---------------------------------------------------
        // Seed Rider Premium Rates
        // ---------------------------------------------------
        for (const row of rows) {
            const entryAge = row.Term;
            const riderTerm = 100 - entryAge;

            if (row.T1 == null || row.T1 <= 0) {
                continue;
            }

            const premiumPayingTerm = 1;

            // ---------------------------------------------------
            // Check existing rate
            // ---------------------------------------------------
            const existing = await prisma.riderPremiumRate.findFirst({
                where: {
                    riderId: addbRider.id,
                    productId: product.id,
                    entryAge,
                    riderTerm,
                    premiumPayingTerm,
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
                        ratePerThousand: row.T1,
                    },
                });
            } else {
                await prisma.riderPremiumRate.create({
                    data: {
                        riderId: addbRider.id,
                        productId: product.id,
                        entryAge,
                        riderTerm,
                        premiumPayingTerm,
                        option: null,
                        gender: null,
                        ratePerThousand: row.T1,
                    },
                });
            }

            console.log(
                `✅ Age ${entryAge} | Rider Term ${riderTerm} | PPT ${premiumPayingTerm} | Rate ${row.T1}`
            );
        }

        console.log("✅ ADD-B Plan 883 seeded successfully");
    } finally {
        db.close();
    }
}