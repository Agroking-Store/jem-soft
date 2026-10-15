import { PrismaClient } from "@prisma/client";
import Database from "better-sqlite3";

export async function seedADDB888(prisma: PrismaClient) {
    const db = new Database("./prisma/Creations.db", {
        readonly: true,
    });

    try {
        console.log("🌱 Seeding ADD-B Plan 888 - Category 1...");

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
        // Find Product 888
        // ---------------------------------------------------
        const product = await prisma.productMaster.findFirst({
            where: {
                planNumber: "888",
            },
        });

        if (!product) {
            throw new Error("Product 888 not found");
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
        // Read ADD-B 888 Category 1 data from SQLite
        // ---------------------------------------------------
        const rows = db
            .prepare(`
        SELECT
          Term,
          cat_1
        FROM addb_888
        ORDER BY Term
      `)
            .all() as {
                Term: number;
                cat_1: number | null;
            }[];

        // ---------------------------------------------------
        // Seed Rider Premium Rates
        // ---------------------------------------------------
        for (const row of rows) {
            if (row.cat_1 == null || row.cat_1 <= 0) {
                continue;
            }

            const existing = await prisma.riderPremiumRate.findFirst({
                where: {
                    riderId: addbRider.id,
                    productId: product.id,
                    entryAge: 0,
                    riderTerm: row.Term,
                    premiumPayingTerm: null,
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
                        ratePerThousand: row.cat_1,
                    },
                });
            } else {
                await prisma.riderPremiumRate.create({
                    data: {
                        riderId: addbRider.id,
                        productId: product.id,
                        entryAge: 0,
                        riderTerm: row.Term,
                        premiumPayingTerm: null,
                        option: null,
                        gender: null,
                        ratePerThousand: row.cat_1,
                    },
                });
            }

            console.log(
                `✅ Term ${row.Term} | Category 1 | Rate ${row.cat_1}`
            );
        }

        console.log("✅ ADD-B Plan 888 Category 1 seeded successfully");
    } finally {
        db.close();
    }
}