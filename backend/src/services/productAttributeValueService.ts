import { prisma } from "../config/database.js";
import { AppError } from "../utils/AppError.js";

export interface IProductAttributeValueInput {
  productId: string;
  attributeId: string;
  value: string;
}

const ATTRIBUTE_VALUE_INCLUDE = {
  product: { select: { id: true, productName: true, productCode: true } },
  attribute: { select: { id: true, attributeName: true, attributeCode: true } },
};

export const createProductAttributeValue = async (data: IProductAttributeValueInput) => {
  return await prisma.productAttributeValue.create({
    data,
    include: ATTRIBUTE_VALUE_INCLUDE,
  });
};

export const getProductAttributeValues = async () => {
  return await prisma.productAttributeValue.findMany({
    include: ATTRIBUTE_VALUE_INCLUDE,
    orderBy: { product: { productName: "asc" } },
  });
};

export const getProductAttributeValueById = async (id: string) => {
  const attributeValue = await prisma.productAttributeValue.findUnique({ where: { id }, include: ATTRIBUTE_VALUE_INCLUDE });
  if (!attributeValue) throw new AppError("Product Attribute Value not found", 404);
  return attributeValue;
};

export const updateProductAttributeValue = async (id: string, data: Partial<IProductAttributeValueInput>) => {
  await getProductAttributeValueById(id); // check for existence
  return await prisma.productAttributeValue.update({ where: { id }, data, include: ATTRIBUTE_VALUE_INCLUDE });
};

export const deleteProductAttributeValue = async (id: string) => {
  await getProductAttributeValueById(id); // check for existence
  await prisma.productAttributeValue.delete({ where: { id } });
};