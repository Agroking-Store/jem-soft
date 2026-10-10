import { PrismaClient } from "@prisma/client";

export async function seedLIC748SumAssuredRebates(prisma: PrismaClient) {
  const product = await prisma.productMaster.findFirst({
    where: {
      planNumber: "748",
    },
  });

  if (!product) {
    throw new Error("LIC Plan 748 not found.");
  }

  const rebates = [
    // ₹10,00,000 to < ₹20,00,000 : NIL
    {
      minSumAssured: 1000000,
      maxSumAssured: 1999999,
      rebatePerThousand: 0,
    },

    // ₹20,00,000 to < ₹50,00,000 : ₹0.40 per ₹1000 BSA
    {
      minSumAssured: 2000000,
      maxSumAssured: 4999999,
      rebatePerThousand: 0.4,
    },

    // ₹50,00,000 and above : ₹0.70 per ₹1000 BSA
    {
      minSumAssured: 5000000,
      maxSumAssured: null,
      rebatePerThousand: 0.7,
    },
  ];

  for (const rebate of rebates) {
    await prisma.productSumAssuredRebate.upsert({
      where: {
        productId_minSumAssured: {
          productId: product.id,
          minSumAssured: rebate.minSumAssured,
        },
      },
      update: {
        maxSumAssured: rebate.maxSumAssured,
        rebatePerThousand: rebate.rebatePerThousand,
      },
      create: {
        productId: product.id,
        minSumAssured: rebate.minSumAssured,
        maxSumAssured: rebate.maxSumAssured,
        rebatePerThousand: rebate.rebatePerThousand,
      },
    });
  }

  console.log("✅ LIC Plan 748 Sum Assured Rebates Seeded");
}