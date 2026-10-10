import { prisma } from "../config/database.js";
import { Advisor } from "@prisma/client";

/**
 * Retrieves all advisors.
 * @returns A list of all advisors.
 */
export const getAllAdvisors = async (): Promise<Advisor[]> => {
  return prisma.advisor.findMany();
};