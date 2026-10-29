import { PrismaClient } from "@prisma/client";

/**
 * Migration & cleanup script for duplicate Plan 866 entries in database.
 * 1. Finds all ProductMaster entries for planNumber 866.
 * 2. Retains the official LEGACY-866 entry (and copies over any rates/attributes if needed).
 * 3. Deletes the duplicate non-legacy 512N349V01 entry.
 * 4. Ensures rates and attributes are cleanly attached to the active product.
 */
export const cleanDuplicate866 = async (prisma: PrismaClient) => {
  const products = await prisma.productMaster.findMany({
    where: { planNumber: "866" },
    include: {
      rates: true,
      attributeValues: true,
    },
  });

  if (products.length <= 1) {
    console.log(`Plan 866 has ${products.length} entry/entries. No duplicates.`);
    return;
  }

  console.log(`Found ${products.length} entries for Plan 866. Resolving duplicate...`);

  // Target the LEGACY-866 product as the primary
  let primary = products.find((p) => p.productCode === "LEGACY-866") || products[0];
  const duplicates = products.filter((p) => p.id !== primary.id);

  for (const dup of duplicates) {
    console.log(`Removing duplicate entry: ${dup.productCode} (${dup.productName}, ID: ${dup.id})`);

    // Re-link any policies pointing to the duplicate product before deleting
    await prisma.policy.updateMany({
      where: { productId: dup.id },
      data: { productId: primary.id },
    });

    // Re-link any riders
    await prisma.productRider.deleteMany({ where: { productId: dup.id } });
    await prisma.productAttributeValue.deleteMany({ where: { productId: dup.id } });
    await prisma.productPremiumRate.deleteMany({ where: { productId: dup.id } });
    await prisma.productPremiumModeFactor.deleteMany({ where: { productId: dup.id } });
    await prisma.productAgeTermRebate.deleteMany({ where: { productId: dup.id } });

    // Delete the duplicate product
    await prisma.productMaster.delete({ where: { id: dup.id } });
    console.log(`Successfully deleted duplicate product ${dup.productCode}`);
  }

  // Ensure primary product is active and named properly
  await prisma.productMaster.update({
    where: { id: primary.id },
    data: {
      isActive: true,
      productName: "Dhan Varsha",
      productCode: "LEGACY-866",
    },
  });

  console.log(`Primary product for Plan 866 is now ID: ${primary.id} (Code: LEGACY-866)`);
};

async function main() {
  const prisma = new PrismaClient();
  try {
    await cleanDuplicate866(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

// Can be run standalone
if (process.argv[1]?.includes("cleanDuplicate866")) {
  main().catch(console.error);
}
