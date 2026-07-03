import { prisma } from "../config/database.js";
import { PremiumModeMaster } from "@prisma/client";

/**
 * Retrieves all premium modes.
 * @returns A list of all premium modes.
 */
export const getAllPremiumModes = async (): Promise<PremiumModeMaster[]> => {
  return prisma.premiumModeMaster.findMany({ orderBy: { modeName: 'asc' } });
};