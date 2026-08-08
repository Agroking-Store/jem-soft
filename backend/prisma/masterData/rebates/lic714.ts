import { PrismaClient } from "@prisma/client";

export async function seedLIC714SumAssuredRebates(prisma: PrismaClient) {
  const product = await prisma.productMaster.findFirst({
    where: {
      planNumber: "714",
    },
  });
  

  if (!product) {
    throw new Error("LIC Plan 714 not found.");
  }

  const rebates = [
    {
      minSumAssured: 0,
      maxSumAssured: 499999,
      rebatePerThousand: 0,
    },
    {
      minSumAssured: 500000,
      maxSumAssured: 999999,
      rebatePerThousand: 2.5,
    },
    {
      minSumAssured: 1000000,
      maxSumAssured: null,
      rebatePerThousand: 4,
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

  console.log("✅ LIC Plan 714 Sum Assured Rebates Seeded");
}