import { prisma } from "../config/database.js";
import { LicBranch } from "@prisma/client";

/**
 * Creates a new LIC branch.
 * @param data - The data for the new branch.
 * @returns The created branch.
 */
export const createLicBranch = async (
  data: Omit<LicBranch, "id" | "createdAt" | "updatedAt">
): Promise<LicBranch> => {
  return prisma.licBranch.create({ data });
};

/**
 * Retrieves all LIC branches.
 * @returns A list of all LIC branches.
 */
export const getAllLicBranches = async (): Promise<LicBranch[]> => {
  return prisma.licBranch.findMany({
    orderBy: {
      branchCode: 'asc',
    },
  });
};

/**
 * Retrieves a LIC branch by its ID.
 * @param id - The ID of the branch to retrieve.
 * @returns The branch, or null if not found.
 */
export const getLicBranchById = async (id: string): Promise<LicBranch | null> => {
  return prisma.licBranch.findUnique({ where: { id } });
};

/**
 * Updates a LIC branch.
 * @param id - The ID of the branch to update.
 * @param data - The data to update.
 * @returns The updated branch.
 */
export const updateLicBranch = async (id: string, data: Partial<Omit<LicBranch, "id">>): Promise<LicBranch> => {
  return prisma.licBranch.update({ where: { id }, data });
};

/**
 * Deletes a LIC branch.
 * @param id - The ID of the branch to delete.
 */
export const deleteLicBranch = async (id: string): Promise<void> => {
  await prisma.licBranch.delete({ where: { id } });
};