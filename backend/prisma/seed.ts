import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Admin@1234", 10);

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@jemsoft.com" },
    update: {},
    create: {
      name: "Admin User",
      email: "admin@jemsoft.com",
      password: passwordHash,
      role: "ADMIN",
    },
  });

  const provider = await prisma.insuranceProvider.upsert({
    where: { code: "LIC" },
    update: {},
    create: {
      type: "Insurance",
      name: "Life Insurance Corporation",
      code: "LIC",
      description: "Seeded provider for advisor testing",
      isActive: true,
    },
  });

  const advisor = await prisma.advisor.upsert({
    where: {
      providerId_advisorCode: {
        providerId: provider.id,
        advisorCode: "ADV001",
      },
    },
    update: {},
    create: {
      providerId: provider.id,
      advisorCode: "ADV001",
      advisorName: "Rahul Sharma",
      email: "rahul@jemsoft.com",
      phone: "9876543210",
      licenseNumber: "LIC123456",
      panNumber: "ABCDE1234F",
      branchCode: "PUNE01",
      designation: "Senior Advisor",
      joiningDate: new Date("2025-01-01T00:00:00.000Z"),
      isActive: true,
    },
  });

  console.log("Seed complete:");
  console.log({ adminUser, provider, advisor });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
