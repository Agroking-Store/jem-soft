import { prisma } from "../config/database.js";
import { PolicyStatusMaster } from "@prisma/client";

/**
 * Retrieves all active policy statuses.
 * @returns A list of all active policy statuses.
 */
export const getAllPolicyStatuses = async (): Promise<PolicyStatusMaster[]> => {
  return prisma.policyStatusMaster.findMany({ where: { isActive: true }, orderBy: { statusName: 'asc' } });
};