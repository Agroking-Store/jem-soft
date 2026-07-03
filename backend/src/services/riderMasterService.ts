import { prisma } from "../config/database.js";
import { RiderMaster } from "@prisma/client";

/**
 * Creates a new rider master.
 * @param data - The data for the new rider master.
 * @returns The created rider master.
 */
export const createRiderMaster = async (
  data: Omit<RiderMaster, "id" | "createdAt" | "updatedAt">
): Promise<RiderMaster> => {
  return prisma.riderMaster.create({
    data,
  });
};

/**
 * Retrieves all rider masters.
 * @returns A list of all rider masters.
 */
export const getAllRiderMasters = async (): Promise<RiderMaster[]> => {
  return prisma.riderMaster.findMany();
};

/**
 * Retrieves a rider master by its ID.
 * @param id - The ID of the rider master to retrieve.
 * @returns The rider master, or null if not found.
 */
export const getRiderMasterById = async (id: string): Promise<RiderMaster | null> => {
  return prisma.riderMaster.findUnique({
    where: { id },
  });
};

/**
 * Updates a rider master.
 * @param id - The ID of the rider master to update.
 * @param data - The data to update.
 * @returns The updated rider master.
 */
export const updateRiderMaster = async (id: string, data: Partial<Omit<RiderMaster, "id" | "createdAt" | "updatedAt">>): Promise<RiderMaster> => {
  return prisma.riderMaster.update({
    where: { id },
    data,
  });
};

/**
 * Deletes a rider master.
 * @param id - The ID of the rider master to delete.
 */
export const deleteRiderMaster = async (id: string): Promise<void> => {
  await prisma.riderMaster.delete({
    where: { id },
  });
};