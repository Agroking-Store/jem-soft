import { prisma } from "../config/database.js";
import { ProductMaster } from "@prisma/client";

type ProductCreateData = Omit<ProductMaster, "id" | "createdAt" | "updatedAt">;
type ProductUpdateData = Partial<ProductCreateData>;

export const getProducts = async () => {
  return await prisma.productMaster.findMany({
    include: { provider: true, category: true },
    orderBy: { productName: "asc" },
  });
};

export const getProductById = async (id: string) => {
  return await prisma.productMaster.findUnique({
    where: { id },
    include: { provider: true, category: true },
  });
};

export const createProduct = async (data: ProductCreateData) => {
  return await prisma.productMaster.create({ data });
};

export const updateProduct = async (id: string, data: ProductUpdateData) => {
  return await prisma.productMaster.update({
    where: { id },
    data,
  });
};

export const deleteProduct = async (id: string) => {
  return await prisma.productMaster.delete({ where: { id } });
};