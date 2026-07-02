import { prisma } from "../config/database.js";
import { InsuranceProvider } from "@prisma/client";

type ProviderCreateData = Omit<InsuranceProvider, "id" | "createdAt" | "updatedAt">;
type ProviderUpdateData = Partial<ProviderCreateData>;

export const getProviders = async () => {
  return await prisma.insuranceProvider.findMany({
    orderBy: { name: "asc" },
  });
};

export const getProviderById = async (id: string) => {
  return await prisma.insuranceProvider.findUnique({ where: { id } });
};

export const createProvider = async (data: ProviderCreateData) => {
  return await prisma.insuranceProvider.create({ data });
};

export const updateProvider = async (id: string, data: ProviderUpdateData) => {
  return await prisma.insuranceProvider.update({
    where: { id },
    data,
  });
};

export const deleteProvider = async (id: string) => {
  return await prisma.insuranceProvider.delete({ where: { id } });
};