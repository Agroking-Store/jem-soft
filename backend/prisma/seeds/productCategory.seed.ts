import { PrismaClient } from '@prisma/client';

export const seedProductCategories = async (prisma: PrismaClient) => {
  console.log('Seeding product categories...');
  const dbProviders = await prisma.insuranceProvider.findMany({ select: { id: true, code: true } });

  for (const provider of dbProviders) {
    await prisma.productCategory.upsert({
      where: { categoryCode: `${provider.code}_LIFE` },
      update: {
        categoryName: 'Life Insurance',
        description: 'Life insurance products',
      },
      create: {
        providerId: provider.id,
        categoryName: 'Life Insurance',
        categoryCode: `${provider.code}_LIFE`,
        description: 'Life insurance products',
      },
    });
    console.log(`Upserted category 'Life Insurance' for ${provider.code}`);
  }
};