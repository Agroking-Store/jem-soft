import { PrismaClient } from "@prisma/client";
import Database from "better-sqlite3";

export async function seedADDB912(prisma: PrismaClient) {
    const db = new Database("./prisma/Creations.db", { readonly: true });

    try {
        console.log("🌱 Seeding ADD-B Plan 912...");

        // ---------------------------------------------------
        // Find ADD-B Rider
        // ---------------------------------------------------
        const addbRider = await prisma.riderMaster.findUnique({
            where: { riderCode: "ADDB" },
        });

        if (!addbRider) {
            throw new Error("ADDB rider not found");
        }

        // ---------------------------------------------------
        // Find Product 912
        // ---------------------------------------------------
        const product = await prisma.productMaster.findFirst({
            where: { planNumber: "912" },
        });

        if (!product) {
            throw new Error("Product 912 not found");
        }

        // ---------------------------------------------------
        // Link ADDB Rider to Product
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
        // Link TERM Rider to Product
        // ---------------------------------------------------
        const termRider = await prisma.riderMaster.findUnique({
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
        }

        // ---------------------------------------------------
        // Read source data
        // Term = Rider Term
        // T6/T8/T10/T12/T15 = PPT
        // ---------------------------------------------------
        const rows = db.prepare(`
      SELECT
        Term,
        T6,
        T8,
        T10,
        T12,
        T15
      FROM addb_912
      WHERE Term BETWEEN 10 AND 20
      ORDER BY Term
    `).all() as {
            Term: number;
            T6: number | null;
            T8: number | null;
            T10: number | null;
            T12: number | null;
            T15: number | null;
        }[];

        // ---------------------------------------------------
        // Entry Age = 0 to 60
        // Rider Term = Source Term 10 to 20
        // ---------------------------------------------------
        for (let entryAge = 0; entryAge <= 60; entryAge++) {
            for (const row of rows) {
                const riderTerm = row.Term;

                const rates = [
                    {
                        premiumPayingTerm: 6,
                        rate: row.T6,
                    },
                    {
                        premiumPayingTerm: 8,
                        rate: row.T8,
                    },
                    {
                        premiumPayingTerm: 10,
                        rate: row.T10,
                    },
                    {
                        premiumPayingTerm: 12,
                        rate: row.T12,
                    },
                    {
                        premiumPayingTerm: 15,
                        rate: row.T15,
                    },
                ];

                for (const item of rates) {
                    if (item.rate == null || item.rate <= 0) {
                        continue;
                    }

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
        }

        console.log("✅ ADD-B Plan 912 seeded successfully");
    } finally {
        db.close();
    }
}