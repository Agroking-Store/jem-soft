import { PrismaClient } from "@prisma/client";
import Database from "better-sqlite3";

export async function seedADDB760(prisma: PrismaClient) {
    const db = new Database("./prisma/Creations.db", {
        readonly: true,
    });

    try {
        console.log("🌱 Seeding ADD-B Plan 760...");

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
        // Find Product 760
        // ---------------------------------------------------
        const product = await prisma.productMaster.findFirst({
            where: {
                planNumber: "760",
            },
        });

        if (!product) {
            throw new Error("Product 760 not found");
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
        // Read ADD-B 760 data from SQLite
        // ---------------------------------------------------
        const rows = db
            .prepare(`
        SELECT
          Term,
          AB_DB
        FROM addb_760
        ORDER BY Term
      `)
            .all() as {
                Term: number;
                AB_DB: number | null;
            }[];

        // ---------------------------------------------------
        // Seed Rider Premium Rates
        // ---------------------------------------------------
        for (const row of rows) {
            if (row.AB_DB == null || row.AB_DB <= 0) {
                continue;
            }

            // ---------------------------------------------------
            // Check existing rate
            // ---------------------------------------------------
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
                        ratePerThousand: row.AB_DB,
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
                        ratePerThousand: row.AB_DB,
                    },
                });
            }

            console.log(
                `✅ Term ${row.Term} | Rate ${row.AB_DB}`
            );
        }

        console.log("✅ ADD-B Plan 760 seeded successfully");
    } finally {
        db.close();
    }
}