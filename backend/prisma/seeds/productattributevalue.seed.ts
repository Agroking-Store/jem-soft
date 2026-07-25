import { PrismaClient } from "@prisma/client";
import { productAttributeValues } from "../masterData/productAttributeValues";
import { bajajLifePolicyAttributeValues as bajajallianzAttributeValues } from "../masterData/productsAttributeValues/bajajallianzAttributeValues";
import { canaraHsbcPolicyAttributes as canaraAttributeValues } from "../masterData/productsAttributeValues/canaraAttributeValues";
import { futureGeneraliPolicyAttributeValues as futuregeneraliAttributeValues } from "../masterData/productsAttributeValues/futuregeneraliAttributeValues";
import { pnbMetlifePolicyAttributeValues as pnbAttributeValues } from "../masterData/productsAttributeValues/pnbAttributeValues";
import { shriramLifeProductAttributes as shriramAttributeValues } from "../masterData/productsAttributeValues/shriramAttributeValues";
import { LicProductAttributeValues } from "../masterData/LicProductAttributeValues";

const allProductAttributeValues = [
  ...productAttributeValues,
  ...bajajallianzAttributeValues,
  ...canaraAttributeValues,
  ...futuregeneraliAttributeValues,
  ...pnbAttributeValues,
  ...shriramAttributeValues,
  ...LicProductAttributeValues,
];

export const seedProductAttributeValues = async (prisma: PrismaClient) => {
  console.log("Seeding product attribute values...");
  if (allProductAttributeValues.length === 0) {
    console.log("No product attribute values to seed.");
    return;
  }

  for (const attrValue of allProductAttributeValues) {
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
      console.log(
        `Upserted attribute '${attribute.attributeName}' for product '${product.productName}'`
      );
    } else {
      console.warn(
        `Could not find product '${attrValue.productCode}' or attribute '${attrValue.attributeCode}'. Skipping.`
      );
    }
  }
};