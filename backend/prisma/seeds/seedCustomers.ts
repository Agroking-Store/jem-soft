import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

// Helper to parse dates like "03/01/1950", "26/11/1951", "03/01/50", "DD/MM/YYYY"
function parseDate(str?: string | null): Date | null {
  if (!str || typeof str !== "string") return null;
  const cleaned = str.trim();
  if (!cleaned || cleaned.includes("__")) return null;

  const parts = cleaned.split(/[\/\-\.]/);
  if (parts.length !== 3) return null;

  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  let year = parseInt(parts[2], 10);

  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;

  // Handle 2-digit year (e.g. 50 -> 1950, 19 -> 2019)
  if (year < 100) {
    year = year <= 30 ? 2000 + year : 1900 + year;
  }

  const d = new Date(year, month, day);
  return isNaN(d.getTime()) ? null : d;
}

async function seedCustomers() {
  console.log("==================================================");
  console.log("🚀 Starting Customer (Member) Seeder for Jem Soft...");
  console.log("==================================================");

  // Locate the scraped customers JSON file
  const backendDir = path.resolve(__dirname, "../../");
  const files = fs
    .readdirSync(backendDir)
    .filter((f) => f.startsWith("imagic_customers_") && f.endsWith(".json"))
    .sort()
    .reverse(); // picks rich_301 first

  if (files.length === 0) {
    console.error("❌ No 'imagic_customers_*.json' file found in backend directory!");
    process.exit(1);
  }

  const targetFile = path.join(backendDir, files[0]);
  console.log(`📂 Reading customer data from: ${targetFile}`);

  const raw = fs.readFileSync(targetFile, "utf-8");
  const customers = JSON.parse(raw);
  console.log(`📊 Found ${customers.length} customer records to process.`);

  // Pre-load all customer groups from PostgreSQL for in-memory lookup
  const groups = await prisma.customer.findMany({
    select: { id: true, groupCode: true, groupName: true },
  });
  const groupMap = new Map<string, string>();
  for (const g of groups) {
    if (g.groupCode) {
      groupMap.set(g.groupCode.trim().toUpperCase(), g.id);
    }
  }
  console.log(`🏢 Loaded ${groupMap.size} customer groups from database.`);

  let createdCount = 0;
  let skippedCount = 0;

  for (const [idx, item] of customers.entries()) {
    const rawCode = (item.groupCode || "").trim().toUpperCase();
    const groupId = groupMap.get(rawCode);

    if (!groupId) {
      console.warn(`⚠️ [${idx + 1}/${customers.length}] Group code not found in DB: "${item.groupCode}". Skipping.`);
      skippedCount++;
      continue;
    }

    // Determine first, middle, last name
    let firstName = (item.firstName || "").trim();
    let middleName = (item.middleName || "").trim() || null;
    let lastName = (item.lastName || "").trim() || null;

    if (!firstName && item.fullName) {
      const parts = item.fullName.trim().split(/\s+/);
      firstName = parts[0] || "Customer";
      if (!lastName && parts.length > 1) {
        lastName = parts.slice(1).join(" ");
      }
    }

    if (!firstName) {
      firstName = "Customer";
    }

    const dob = parseDate(item.dob);
    const gender = item.gender ? item.gender.trim().toUpperCase().charAt(0) : null;
    const isGroupHead = Boolean(item.isGroupHead);

    // Extract address array
    const addressList: any[] = [];
    if (Array.isArray(item.addresses) && item.addresses.length > 0) {
      for (const a of item.addresses) {
        if (a.addressLine1 || a.city || a.state) {
          addressList.push({
            addressType: a.addressType || "Residence",
            addressLine1: a.addressLine1 || null,
            addressLine2: a.addressLine2 || null,
            addressLine3: a.addressLine3 || null,
            city: a.city || null,
            pin: a.pin || null,
            state: a.state || null,
            country: a.country || "India",
            useGroupAddress: Boolean(a.useGroupAddress),
          });
        }
      }
    } else if (item.address && (item.address.resAddressLine1 || item.address.resCity)) {
      addressList.push({
        addressType: "Residence",
        addressLine1: item.address.resAddressLine1 || null,
        addressLine2: item.address.resAddressLine2 || null,
        addressLine3: item.address.resAddressLine3 || null,
        city: item.address.resCity || null,
        pin: item.address.resPin || null,
        state: item.address.resState || null,
        country: item.address.resCountry || "India",
        useGroupAddress: Boolean(item.address.useGroupHeadAddress),
      });
    }

    // Extract bank details
    const bankList: any[] = [];
    if (Array.isArray(item.bankDetails) && item.bankDetails.length > 0) {
      for (const b of item.bankDetails) {
        if (b.bankName || b.accountNumber || b.ifscCode) {
          bankList.push({
            ifscCode: b.ifscCode || null,
            bankName: b.bankName || null,
            bankBranch: b.bankBranch || null,
            city: b.city || null,
            accountType: b.accountType || null,
            accountNumber: b.accountNumber || null,
            micrNumber: b.micrNumber || null,
          });
        }
      }
    }

    try {
      await prisma.customerMaster.create({
        data: {
          groupId,
          salutation: item.salutation || null,
          firstName,
          middleName,
          lastName,
          gender,
          dob,
          isGroupHead,
          customerType: item.customerType || "INDIVIDUAL",
          panNumber: item.panNumber?.trim() || null,
          aadhaarNumber: item.aadhaarNumber?.trim() || null,

          // Contact Info
          contactInfo: {
            create: {
              mobile1: item.contactInfo?.mobilePersonal?.trim() || item.mobile?.trim() || null,
              mobile2: item.contactInfo?.mobileBusiness?.trim() || null,
              landline1Number: item.contactInfo?.landline1Number?.trim() || null,
              landline2Number: item.contactInfo?.landline2Number?.trim() || null,
              emailPersonal: item.contactInfo?.emailPersonal?.trim() || item.email?.trim() || null,
              emailBusiness: item.contactInfo?.emailBusiness?.trim() || null,
              skypeId: item.contactInfo?.skypeId?.trim() || null,
            },
          },

          // Misc Info & Demographics
          miscInfo: {
            create: {
              relationToGroup: item.miscInfo?.relationToGroup?.trim() || item.relation?.trim() || (isGroupHead ? "Self" : null),
              dobForGreetings: parseDate(item.miscInfo?.dobForGreetings) || dob,
              marriageDate: parseDate(item.miscInfo?.marriageDate),
              isMarried: Boolean(item.miscInfo?.isMarried),
              fatherName: item.miscInfo?.fatherName?.trim() || null,
              spouseName: item.miscInfo?.spouseName?.trim() || null,
              motherName: item.miscInfo?.motherName?.trim() || null,
              nationality: item.miscInfo?.nationality || "Indian",
              occupationType: item.miscInfo?.occupationType?.trim() || null,
              occupation: item.miscInfo?.occupation?.trim() || null,
              qualification: item.miscInfo?.qualification?.trim() || null,
              religion: item.miscInfo?.religion?.trim() || null,
              specialNote: item.miscInfo?.specialNote?.trim() || null,
            },
          },

          // Addresses
          addresses: addressList.length > 0 ? { create: addressList } : undefined,

          // Bank Details
          bankDetails: bankList.length > 0 ? { create: bankList } : undefined,

          // Preferences (Marketing disabled to prevent emails)
          preferences: {
            create: {
              emailMarketing: false,
              smsMarketing: false,
              preferredCommAddress: item.preferences?.preferredCommAddress || "Residence",
            },
          },
        },
      });

      createdCount++;
      if (createdCount % 25 === 0 || createdCount === customers.length) {
        console.log(`✅ [${createdCount}/${customers.length}] Seeded: ${firstName} ${lastName || ""} (Group: ${rawCode})`);
      }
    } catch (err: any) {
      console.error(`❌ Error inserting customer ${firstName} (${rawCode}):`, err.message);
    }
  }

  console.log("==================================================");
  console.log(`🎉 Seeding complete!`);
  console.log(`📊 Successfully inserted: ${createdCount} customers`);
  if (skippedCount > 0) console.log(`⚠️ Skipped: ${skippedCount} (unmatched group codes)`);
  console.log("==================================================");
}

seedCustomers()
  .catch((err) => {
    console.error("Fatal Seeder Error:", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
