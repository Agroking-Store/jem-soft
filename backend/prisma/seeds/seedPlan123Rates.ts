import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const rates = [
  { age: 14, rate: 115.15 },
  { age: 15, rate: 115.15 },
  { age: 16, rate: 115.15 },
  { age: 17, rate: 115.15 },
  { age: 18, rate: 115.15 },
  { age: 19, rate: 115.15 },
  { age: 20, rate: 115.15 },
  { age: 21, rate: 115.15 },
  { age: 22, rate: 115.15 },
  { age: 23, rate: 115.15 },
  { age: 24, rate: 115.15 },
  { age: 25, rate: 115.20 },
  { age: 26, rate: 115.20 },
  { age: 27, rate: 115.30 },
  { age: 28, rate: 115.35 },
  { age: 29, rate: 115.45 },
  { age: 30, rate: 115.55 },
  { age: 31, rate: 115.65 },
  { age: 32, rate: 115.85 },
  { age: 33, rate: 115.95 },
  { age: 34, rate: 116.10 },
  { age: 35, rate: 116.30 },
  { age: 36, rate: 116.55 },
  { age: 37, rate: 116.85 },
  { age: 38, rate: 117.15 },
  { age: 39, rate: 117.50 },
  { age: 40, rate: 117.90 },
  { age: 41, rate: 118.40 },
  { age: 42, rate: 118.95 },
  { age: 43, rate: 119.55 },
  { age: 44, rate: 120.20 },
  { age: 45, rate: 120.95 },
  { age: 46, rate: 121.80 },
  { age: 47, rate: 122.70 },
  { age: 48, rate: 123.70 },
  { age: 49, rate: 124.75 },
  { age: 50, rate: 125.95 },
  { age: 51, rate: 127.25 },
  { age: 52, rate: 128.70 },
  { age: 53, rate: 130.25 },
  { age: 54, rate: 131.95 },
  { age: 55, rate: 133.80 },
  { age: 56, rate: 135.80 },
  { age: 57, rate: 137.95 },
  { age: 58, rate: 140.30 },
];

export async function seedPlan123Rates() {
  const product = await prisma.productMaster.findFirst({
    where: { planNumber: "123", productCode: { startsWith: "LEGACY-" } },
    select: { id: true },
  });

  if (!product) {
    console.log("[seedPlan123Rates] Product 123 not found");
    return;
  }

  for (const r of rates) {
    const existing = await prisma.productPremiumRate.findFirst({
      where: {
        productId: product.id,
        entryAge: r.age,
        policyTerm: 12,
        premiumPayingTerm: 12,
      },
    });

    if (!existing) {
      await prisma.productPremiumRate.create({
        data: {
          productId: product.id,
          entryAge: r.age,
          policyTerm: 12,
          premiumPayingTerm: 12,
          tabularRate: r.rate,
        },
      });
    }
  }

  console.log(`[seedPlan123Rates] Seeded/verified ${rates.length} rates for Plan 123.`);
}

if (process.argv[1]?.endsWith("seedPlan123Rates.ts")) {
  seedPlan123Rates()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
}
