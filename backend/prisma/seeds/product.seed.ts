import { PrismaClient } from '@prisma/client';
import { productsData } from '../masterData/products';

export const seedProducts = async (prisma: PrismaClient) => {
  console.log('Seeding products...');
  const dbCategories = await prisma.productCategory.findMany({ select: { id: true, providerId: true, categoryCode: true } });
  const categoryMap = new Map(dbCategories.map(c => [c.categoryCode, { id: c.id, providerId: c.providerId }]));

  for (const productData of productsData) {
    const categoryInfo = categoryMap.get(`${productData.providerCode}_LIFE`);
    if (!categoryInfo) {
      console.warn(`Category ${productData.providerCode}_LIFE not found. Skipping ${productData.productName}`);
      continue;
    }

    const { providerCode, ...product } = productData;

    await prisma.productMaster.upsert({
      where: { 
      providerId_productCode: {
      providerId: categoryInfo.providerId, 
      productCode: productData.productCode, 
    },
  },
      update: {
        categoryId: categoryInfo.id,
        productName: productData.productName,
        planNumber: productData.planNumber
      },
      create: {
        providerId: categoryInfo.providerId,
        categoryId: categoryInfo.id,
        ...product,
      },
    });
    console.log(`Upserted product: ${productData.productName}`);
  }
};