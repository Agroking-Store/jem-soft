import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

export const connectDB = async (): Promise<void> => {
  try {
    await prisma.$connect();
    console.log("✅ PostgreSQL connected via Prisma");
  } catch (error) {
    console.error("❌ PostgreSQL connection error:", error);
    process.exit(1);
  }
};

export default prisma;
