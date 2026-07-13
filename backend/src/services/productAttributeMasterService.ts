import { prisma } from "../config/database.js";
import { AppError } from "../utils/AppError.js";

export interface IProductAttributeMasterInput {
  attributeName: string;
  attributeCode: string;
  dataType: string;
  description?: string;
}

const ATTRIBUTE_MASTER_INCLUDE = {
  productAttributeValues: {
    select: {
      id: true,
      value: true,
      product: { select: { id: true, productName: true } },
    },
  },
};

export const createProductAttributeMaster = async (data: IProductAttributeMasterInput) => {
  return await prisma.productAttributeMaster.create({
    data,
    include: ATTRIBUTE_MASTER_INCLUDE,
  });
};

export const getProductAttributeMasters = async () => {
  return await prisma.productAttributeMaster.findMany({
    include: ATTRIBUTE_MASTER_INCLUDE,
    orderBy: { attributeName: "asc" },
  });
};

export const getProductAttributeMasterById = async (id: string) => {
  const attribute = await prisma.productAttributeMaster.findUnique({ where: { id }, include: ATTRIBUTE_MASTER_INCLUDE });
  if (!attribute) throw new AppError("Product Attribute Master not found", 404);
  return attribute;
};

export const updateProductAttributeMaster = async (id: string, data: Partial<IProductAttributeMasterInput>) => {
  await getProductAttributeMasterById(id); // check for existence
  return await prisma.productAttributeMaster.update({ where: { id }, data, include: ATTRIBUTE_MASTER_INCLUDE });
};

export const deleteProductAttributeMaster = async (id: string) => {
  await getProductAttributeMasterById(id); // check for existence
  await prisma.productAttributeMaster.delete({ where: { id } });
};