import { prisma } from "../config/database.js";
import { PaymentModeMaster } from "@prisma/client";

export const getAllPaymentModes = async (): Promise<PaymentModeMaster[]> => {
  return prisma.paymentModeMaster.findMany({ orderBy: { modeName: 'asc' } });
};