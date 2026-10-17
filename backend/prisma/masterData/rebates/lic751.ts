import { PrismaClient } from "@prisma/client";


export async function seedLIC751SumAssuredRebates(prisma: PrismaClient) {
  const product = await prisma.productMaster.findFirst({
    where: {
      planNumber: "751",
    },
  });

  if (!product) {
    throw new Error("LIC Plan 751 not found.");
  }

  const rebates = [
    {
      minSumAssured: 0,
      maxSumAssured: 200000,
      rebatePerThousand: 3,
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

  console.log("✅ LIC Plan 751 Sum Assured Rebates Seeded");
}