import { PrismaClient } from "@prisma/client";
import Database from "better-sqlite3";

export const seedRiderPremium717 = async (prisma: PrismaClient) => {
  const sqlite = new Database("./prisma/Creations.db", {
    readonly: true,
  });

  const tableName = "TermRider_717";
  const riderCode = "TERM";

  try {
    const premiumRows = sqlite
      .prepare(`SELECT * FROM "${tableName}"`)
      .all() as any[];

    console.log(`Processing ${tableName} (${premiumRows.length} rows)`);

    const rider = await prisma.riderMaster.findUnique({
      where: {
        riderCode,
      },
    });

    if (!rider) {
      console.log(`❌ Rider with code ${riderCode} not found in RiderMaster`);
      return;
    }

    console.log(`Matched Rider: ${rider.riderName} (${rider.riderCode})`);

    const product = await prisma.productMaster.findFirst({
      where: {
        planNumber: "717",
      },
    });

    if (!product) {
      console.log(`❌ Product with planNumber 717 not found in ProductMaster`);
      return;
    }

    console.log(
      `Matched Product: ${product.productName} (Plan ${product.planNumber})`,
    );

    let inserted = 0;
    let skipped = 0;
    let invalid = 0;
    let updated = 0;

    if (premiumRows.length === 0) {
      console.log(`❌ No data found in ${tableName}`);
      return;
    }

    // Detect columns like T10, T11 ... T25
    const termColumns = Object.keys(premiumRows[0]).filter((key) =>
      /^T\d+$/.test(key),
    );

    console.log("Term columns:", termColumns);

    for (const row of premiumRows) {
      const entryAge = Number(row.Age);

      // Skip note/invalid rows
      if (Number.isNaN(entryAge)) {
        invalid++;
        continue;
      }

      for (const column of termColumns) {
        const match = column.match(/^T(\d+)$/);

        if (!match) {
          continue;
        }

        const riderTerm = Number(match[1]);
        const rate = Number(row[column]);

        // Skip empty / zero / invalid rates
        if (
          row[column] == null ||
          row[column] === "" ||
          rate === 0 ||
          Number.isNaN(rate)
        ) {
          continue;
        }

        // Only look at Plan 717-specific records; never touch legacy 714/715 records
        const existing = await prisma.riderPremiumRate.findFirst({
          where: {
            riderId: rider.id,
            entryAge,
            riderTerm,
            option: null,
          },
        });

        if (existing) {
          const existingRate = Number(existing.ratePerThousand);

          // Same exact record already exists
          if (existingRate === rate) {
            skipped++;
          } else {
            // Update ONLY the Plan 717-specific record
            await prisma.riderPremiumRate.update({
              where: {
                id: existing.id,
              },
              data: {
                ratePerThousand: rate,
              },
            });

            updated++;
            console.log(
              `♻ Updated 717 Rate: Age ${entryAge}, Term ${riderTerm} | Old Rate: ${existingRate} | New Rate: ${rate}`,
            );
          }

          continue;
        }

        await prisma.riderPremiumRate.create({
          data: {
            riderId: rider.id,
            entryAge,
            riderTerm,
            ratePerThousand: rate,
            option: null,
          },
        });

        inserted++;
      }
    }

    console.log("\n=================================");
    console.log(`✔ Rider Code : ${rider.riderCode}`);
    console.log(`✔ Rider Name : ${rider.riderName}`);
    console.log(`✔ Source     : ${tableName}`);
    console.log(`✔ Age Range  : 18 - 60`);
    console.log(`✔ Term Range : T10 - T25`);
    console.log(`✔ Inserted   : ${inserted}`);
    console.log(`✔ Skipped    : ${skipped}`);
    console.log(`✔ Invalid    : ${invalid}`);
    console.log(`♻ Updated    : ${updated}`);
    console.log("=================================");
  } catch (error) {
    console.error(`❌ Error seeding ${tableName}:`, error);
    throw error;
  } finally {
    sqlite.close();
  }
};
