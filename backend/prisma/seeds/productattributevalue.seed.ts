import { PrismaClient } from '@prisma/client';
import { productAttributeValues } from '../masterData/productAttributeValues';

export const seedProductAttributeValues = async (prisma: PrismaClient) => {
  console.log('Seeding product attribute values...');
  if (productAttributeValues.length === 0) {
    console.log('No product attribute values to seed.');
    return;
  }

  for (const attrValue of productAttributeValues) {
    const product = await prisma.productMaster.findFirst({
      where: { productName: attrValue.productCode },
    });

    const attribute = await prisma.productAttributeMaster.findUnique({
      where: { attributeCode: attrValue.attributeCode },
    });

    if (product && attribute) {
      await prisma.productAttributeValue.upsert({
        where: {
          productId_attributeId: {
            productId: product.id,
            attributeId: attribute.id,
          },
        },
        update: {
          value: attrValue.value,
        },
        create: {
          productId: product.id,
          attributeId: attribute.id,
          value: attrValue.value,
        },
      });
      console.log(`Upserted attribute '${attribute.attributeName}' for product '${product.productName}'`);
    } else {
      console.warn(`Could not find product '${attrValue.productCode}' or attribute '${attrValue.attributeCode}'. Skipping.`);
    }
  }
};