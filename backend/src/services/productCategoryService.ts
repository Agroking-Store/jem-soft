import { prisma } from "../config/database.js";
import { ProductCategory } from "@prisma/client";

type CategoryCreateData = Omit<ProductCategory, "id" | "createdAt" | "updatedAt">;
type CategoryUpdateData = Partial<CategoryCreateData>;

export const getCategories = async () => {
  return await prisma.productCategory.findMany({
    include: { provider: true },
    orderBy: { categoryName: "asc" },
  });
};

export const getCategoryById = async (id: string) => {
  return await prisma.productCategory.findUnique({
    where: { id },
    include: { provider: true },
  });
};

export const createCategory = async (data: CategoryCreateData) => {
  return await prisma.productCategory.create({ data });
};

export const updateCategory = async (id: string, data: CategoryUpdateData) => {
  return await prisma.productCategory.update({
    where: { id },
    data,
  });
};

export const deleteCategory = async (id: string) => {
  return await prisma.productCategory.delete({ where: { id } });
};