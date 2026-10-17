import { PrismaClient } from "@prisma/client";
import Database from "better-sqlite3";

export const seedRiderPremium721 = async (prisma: PrismaClient) => {
  const sqlite = new Database("./prisma/Creations.db", {
    readonly: true,
  });

  const tableName = "TermRider_721";
  const riderCode = "TERM";
  const planNumber = "721";

  try {
    // --------------------------------------------------
    // Read SQLite data
    // --------------------------------------------------
    const premiumRows = sqlite
      .prepare(`SELECT * FROM "${tableName}"`)
      .all() as any[];

    console.log(
      `Processing ${tableName} (${premiumRows.length} rows)`
    );

    if (premiumRows.length === 0) {
      console.log(`❌ No data found in ${tableName}`);
      return;
    }

    // --------------------------------------------------
    // Find TERM rider
    // --------------------------------------------------
    const rider = await prisma.riderMaster.findUnique({
      where: {
        riderCode,
      },
    });

    if (!rider) {
      console.log(
        `❌ Rider with code ${riderCode} not found in RiderMaster`
      );
      return;
    }

    console.log(
      `Matched Rider: ${rider.riderName} (${rider.riderCode})`
    );

    // --------------------------------------------------
    // Find Product 721
    // --------------------------------------------------
    const product = await prisma.productMaster.findFirst({
      where: {
        planNumber,
      },
    });

    if (!product) {
      console.log(
        `❌ Product with planNumber ${planNumber} not found in ProductMaster`
      );
      return;
    }

    console.log(
      `Matched Product: ${product.productName} (Plan ${product.planNumber})`
    );

    // --------------------------------------------------
    // Counters
    // --------------------------------------------------
    let inserted = 0;
    let skipped = 0;
    let updated = 0;
    let invalid = 0;

    // --------------------------------------------------
    // Detect term columns
    // Example: T25
    // --------------------------------------------------
    const termColumns = Object.keys(premiumRows[0])
      .filter((key) => /^T\d+$/.test(key))
      .sort((a, b) => {
        const termA = Number(a.substring(1));
        const termB = Number(b.substring(1));

        return termA - termB;
      });

    console.log("Term columns:", termColumns);

    // --------------------------------------------------
    // Process rows
    // --------------------------------------------------
    for (const row of premiumRows) {
      const entryAge = Number(row.Age);

      if (Number.isNaN(entryAge)) {
        console.log(`⚠️ Invalid age: ${row.Age}`);
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

        // --------------------------------------------------
        // IMPORTANT:
        // productId makes the rate Plan 721 specific
        // --------------------------------------------------
        const existing = await prisma.riderPremiumRate.findFirst({
          where: {
            productId: product.id,
            riderId: rider.id,
            entryAge,
            riderTerm,
            premiumPayingTerm: null,
            option: null,
          },
        });

        // --------------------------------------------------
        // Existing record
        // --------------------------------------------------
        if (existing) {
          const existingRate = Number(existing.ratePerThousand);

          // Same rate → skip
          if (existingRate === rate) {
            skipped++;
          } else {
            // Different rate → update Plan 721 record
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
              `♻ Updated 721 Rate: Age ${entryAge}, Term ${riderTerm} | ` +
              `Old Rate: ${existingRate} | New Rate: ${rate}`
            );
          }

          continue;
        }

        // --------------------------------------------------
        // New record
        // --------------------------------------------------
        await prisma.riderPremiumRate.create({
          data: {
            productId: product.id,
            riderId: rider.id,
            entryAge,
            riderTerm,
            premiumPayingTerm: null,
            option: null,
            ratePerThousand: rate,
          },
        });

        inserted++;

        console.log(
          `➕ Inserted 721 Rate: Age ${entryAge}, Term ${riderTerm}, Rate ${rate}`
        );
      }
    }

    // --------------------------------------------------
    // Summary
    // --------------------------------------------------
    console.log("\n=================================");
    console.log("       PLAN 721 RIDER SEED");
    console.log("=================================");
    console.log(`✔ Plan Number : ${planNumber}`);
    console.log(`✔ Rider Code  : ${rider.riderCode}`);
    console.log(`✔ Rider Name  : ${rider.riderName}`);
    console.log(`✔ Source      : ${tableName}`);
    console.log(`✔ Age Range   : 18 - 45`);
    console.log(`✔ Term Range  : T25`);
    console.log(`✔ Inserted    : ${inserted}`);
    console.log(`✔ Skipped     : ${skipped}`);
    console.log(`✔ Invalid     : ${invalid}`);
    console.log(`♻ Updated     : ${updated}`);
    console.log("=================================");
  } catch (error) {
    console.error(
      `❌ Error seeding ${tableName}:`,
      error
    );

    throw error;
  } finally {
    sqlite.close();
  }
};
