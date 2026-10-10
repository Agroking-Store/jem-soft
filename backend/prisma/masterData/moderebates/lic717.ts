import { PrismaClient } from "@prisma/client";

export async function seedLIC717ModeRebates(prisma: PrismaClient) {
  const product = await prisma.productMaster.findFirst({
    where: {
      planNumber: "717",
    },
  });

  if (!product) {
    throw new Error("LIC Plan 717 not found.");
  }

  const yearly = await prisma.premiumModeMaster.findFirst({
    where: {
      modeCode: "YLY",
    },
  });

  if (!yearly) {
    throw new Error("Yearly Premium Mode not found.");
  }

  await prisma.productModeRebate.upsert({
    where: {
      productId_premiumModeId: {
        productId: product.id,
        premiumModeId: yearly.id,
      },
    },
    update: {
      rebatePerThousand: 14.656,
    },
    create: {
      productId: product.id,
      premiumModeId: yearly.id,
      rebatePerThousand: 14.656,
    },
  });

  console.log("✅ LIC Plan 717 Mode Rebate Seeded");
}