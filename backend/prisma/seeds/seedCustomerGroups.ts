import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function main() {
  // Resolve path to imagic_groups_all_1942.json or imagic_groups_top20.json
  const candidatePaths = [
    path.resolve(process.cwd(), "imagic_groups_all_1942.json"),
    path.resolve(process.cwd(), "backend", "imagic_groups_all_1942.json"),
    path.resolve(__dirname, "../../imagic_groups_all_1942.json"),
    path.resolve(process.cwd(), "imagic_groups_top20.json"),
    path.resolve(process.cwd(), "backend", "imagic_groups_top20.json"),
    path.resolve(__dirname, "../../imagic_groups_top20.json"),
  ];

  const filePath = candidatePaths.find((p) => fs.existsSync(p));

  if (!filePath) {
    console.error("❌ Could not find imagic_groups_top20.json. Please make sure the file is placed in backend/ directory.");
    process.exit(1);
  }

  console.log(`📁 Reading customer groups from: ${filePath}`);
  const fileContent = fs.readFileSync(filePath, "utf-8");
  const groupsData = JSON.parse(fileContent);

  if (!Array.isArray(groupsData)) {
    console.error("❌ JSON content is not an array.");
    process.exit(1);
  }

  console.log(`🚀 Found ${groupsData.length} groups to seed...\n`);

  let insertedCount = 0;
  let updatedCount = 0;

  for (const item of groupsData) {
    const groupCode = item.groupCode?.trim();
    const groupName = item.groupName?.trim() || groupCode;

    if (!groupCode) {
      console.warn("⚠️ Skipping item without groupCode:", item);
      continue;
    }

    const payload = {
      groupCode,
      groupName,
      name: groupName,
      category: item.category?.trim() || "Client",
      mobilePersonal: item.mobilePersonal?.trim() || null,
      mobileBusiness: item.mobileBusiness?.trim() || null,
      emailPersonal: item.emailPersonal?.trim() || null,
      emailBusiness: item.emailBusiness?.trim() || null,
      prefCommAddress: item.prefCommAddress?.trim() || "Residence",
      resAddressLine1: item.resAddressLine1?.trim() || null,
      resAddressLine2: item.resAddressLine2?.trim() || null,
      resAddressLine3: item.resAddressLine3?.trim() || null,
      resAddressLine4: item.resAddressLine4?.trim() || null,
      resCity: item.resCity?.trim() || null,
      resPin: item.resPin?.trim() || null,
      resState: item.resState?.trim() || null,
      resCountry: item.resCountry?.trim() || "India",
      resArea: item.resArea?.trim() || null,
      offAddressLine1: item.offAddressLine1?.trim() || null,
      offAddressLine2: item.offAddressLine2?.trim() || null,
      offAddressLine3: item.offAddressLine3?.trim() || null,
      offAddressLine4: item.offAddressLine4?.trim() || null,
      offCity: item.offCity?.trim() || null,
      offPin: item.offPin?.trim() || null,
      offState: item.offState?.trim() || null,
      offCountry: item.offCountry?.trim() || "India",
      offArea: item.offArea?.trim() || null,
    };

    const existing = await prisma.customer.findUnique({
      where: { groupCode },
    });

    if (existing) {
      await prisma.customer.update({
        where: { groupCode },
        data: payload,
      });
      updatedCount++;
      console.log(`🔄 Updated Group: ${groupCode} - ${groupName}`);
    } else {
      await prisma.customer.create({
        data: payload,
      });
      insertedCount++;
      console.log(`✅ Created Group: ${groupCode} - ${groupName}`);
    }
  }

  console.log(`\n🎉 Finished! Inserted: ${insertedCount}, Updated: ${updatedCount}, Total Processed: ${groupsData.length}`);
}

main()
  .catch((err) => {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
