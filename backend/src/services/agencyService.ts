import { prisma } from "../config/database.js";
import { Agency } from "@prisma/client";

/**
 * Creates a new agency.
 * @param data - The data for the new agency.
 * @returns The created agency.
 */
export const createAgency = async (
  data: Omit<Agency, "id" | "createdAt" | "updatedAt">
): Promise<Agency> => {
  return prisma.agency.create({ data });
};

/**
 * Retrieves all agencies.
 * @returns A list of all agencies.
 */
export const getAllAgencies = async (): Promise<Agency[]> => {
  return prisma.agency.findMany();
};

/**
 * Retrieves an agency by its ID.
 * @param id - The ID of the agency to retrieve.
 * @returns The agency, or null if not found.
 */
export const getAgencyById = async (id: string): Promise<Agency | null> => {
  return prisma.agency.findUnique({ where: { id } });
};

/**
 * Updates an agency.
 * @param id - The ID of the agency to update.
 * @param data - The data to update.
 * @returns The updated agency.
 */
export const updateAgency = async (id: string, data: Partial<Omit<Agency, "id">>): Promise<Agency> => {
  return prisma.agency.update({ where: { id }, data });
};

/**
 * Deletes an agency.
 * @param id - The ID of the agency to delete.
 */
export const deleteAgency = async (id: string): Promise<void> => {
  await prisma.agency.delete({ where: { id } });
};