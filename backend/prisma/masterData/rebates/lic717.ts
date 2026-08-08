import { PrismaClient } from "@prisma/client";

export async function seedLIC717SumAssuredRebates(prisma: PrismaClient) {
  const product = await prisma.productMaster.findFirst({
    where: {
      planNumber: "717",
    },
  });

  if (!product) {
    throw new Error("LIC Plan 717 not found.");
  }

  const rebates = [
    {
      minSumAssured: 0,
      maxSumAssured: 199999,
      rebatePerThousand: 0,
    },
    {
      minSumAssured: 200000,
      maxSumAssured: 499999,
      rebatePerThousand: 20,
    },
    {
      minSumAssured: 500000,
      maxSumAssured: null,
      rebatePerThousand: 40,
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

  console.log("✅ LIC Plan 717 Sum Assured Rebates Seeded");
}