import { PrismaClient } from '@prisma/client';
import { productAttributes } from '../masterData/productAttributesmaster';

export const seedProductAttributes = async (prisma: PrismaClient) => {
  console.log('Seeding product attributes...');
  for (const attribute of productAttributes) {
    await prisma.productAttributeMaster.upsert({
      where: { attributeCode: attribute.attributeCode },
      update: {
        attributeName: attribute.attributeName,
        description: attribute.description,
      },
      create: attribute,
    });
    console.log(`Upserted product attribute: ${attribute.attributeName}`);
  }
};