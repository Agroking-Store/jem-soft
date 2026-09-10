import { PrismaClient } from "@prisma/client";
import Database from "better-sqlite3";

export const seedRiderPremium881 = async (prisma: PrismaClient) => {
  const sqlite = new Database("./prisma/Creations.db", {
    readonly: true,
  });

  const tableName = "TermRider_881";
  const riderCode = "TERM";
  const planNumber = "881";

  try {
    // --------------------------------------------------
    // Read SQLite data
    // --------------------------------------------------
    const premiumRows = sqlite
      .prepare(`SELECT * FROM "${tableName}"`)
      .all() as any[];

    console.log(`Processing ${tableName} (${premiumRows.length} rows)`);

    // --------------------------------------------------
    // Validate source data
    // --------------------------------------------------
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
      console.log(`❌ Rider with code ${riderCode} not found in RiderMaster`);
      return;
    }

    console.log(`Matched Rider: ${rider.riderName} (${rider.riderCode})`);

    // --------------------------------------------------
    // Find Plan 881 product
    // --------------------------------------------------
    const product = await prisma.productMaster.findFirst({
      where: {
        planNumber,
      },
    });

    if (!product) {
      console.log(
        `❌ Product with planNumber ${planNumber} not found in ProductMaster`,
      );
      return;
    }

    console.log(
      `Matched Product: ${product.productName} (Plan ${product.planNumber})`,
    );

    let inserted = 0;
    let skipped = 0;
    let invalid = 0;
    let updated = 0;

    // --------------------------------------------------
    // Plan 881 Rider Terms
    //
    // T7  -> Rider Term 7
    // T8  -> Rider Term 8
    // T9  -> Rider Term 9
    // T10 -> Rider Term 10
    // T11 -> Rider Term 11
    // T12 -> Rider Term 12
    // T13 -> Rider Term 13
    // T14 -> Rider Term 14
    // T15 -> Rider Term 15
    // --------------------------------------------------
    const allowedTerms = [7, 8, 9, 10, 11, 12, 13, 14, 15];

    const termColumns = Object.keys(premiumRows[0])
      .filter((key) => {
        const match = key.match(/^T(\d+)$/);

        if (!match) {
          return false;
        }

        return allowedTerms.includes(Number(match[1]));
      })
      .sort((a, b) => {
        const termA = Number(a.substring(1));
        const termB = Number(b.substring(1));

        return termA - termB;
      });

    console.log("Rider Term columns:", termColumns);

    // --------------------------------------------------
    // Process rows
    // --------------------------------------------------
    for (const row of premiumRows) {
      const entryAge = Number(row.Age);

      // Validate Age
      if (Number.isNaN(entryAge)) {
        console.log(`⚠️ Invalid age: ${row.Age}`);
        invalid++;
        continue;
      }

      // ------------------------------------------------
      // Process each Rider Term
      // ------------------------------------------------
      for (const column of termColumns) {
        const match = column.match(/^T(\d+)$/);

        if (!match) {
          continue;
        }

        // T7 -> riderTerm 7
        // T8 -> riderTerm 8
        // ...
        // T15 -> riderTerm 15
        const riderTerm = Number(match[1]);

        const rate = Number(row[column]);

        // ------------------------------------------------
        // Skip empty / zero / invalid rates
        // ------------------------------------------------
        if (
          row[column] == null ||
          row[column] === "" ||
          rate === 0 ||
          Number.isNaN(rate)
        ) {
          continue;
        }

        /*
         * Plan 881:
         *
         * Age -> entryAge
         *
         * T7  -> riderTerm 7
         * T8  -> riderTerm 8
         * T9  -> riderTerm 9
         * T10 -> riderTerm 10
         * T11 -> riderTerm 11
         * T12 -> riderTerm 12
         * T13 -> riderTerm 13
         * T14 -> riderTerm 14
         * T15 -> riderTerm 15
         *
         * premiumPayingTerm -> null
         */

        // ------------------------------------------------
        // Check existing Plan 881 record
        // ------------------------------------------------
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

        // ------------------------------------------------
        // Existing record
        // ------------------------------------------------
        if (existing) {
          const existingRate = Number(existing.ratePerThousand);

          // Same rate -> skip
          if (existingRate === rate) {
            skipped++;
          } else {
            // Different rate -> update
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
              `♻ Updated 881 Rate: Age ${entryAge}, Term ${riderTerm} | Old Rate: ${existingRate} | New Rate: ${rate}`,
            );
          }

          continue;
        }

        // ------------------------------------------------
        // Insert new record
        // ------------------------------------------------
        await prisma.riderPremiumRate.create({
          data: {
            productId: product.id,
            riderId: rider.id,
            entryAge,
            riderTerm,
            premiumPayingTerm: null,
            ratePerThousand: rate,
            option: null,
          },
        });

        inserted++;

        console.log(
          `➕ Inserted 881 Rate: Age ${entryAge}, Term ${riderTerm}, Rate ${rate}`,
        );
      }
    }

    // --------------------------------------------------
    // Summary
    // --------------------------------------------------
    console.log("\n=================================");
    console.log("       PLAN 881 RIDER SEED");
    console.log("=================================");
    console.log(`✔ Rider Code : ${rider.riderCode}`);
    console.log(`✔ Rider Name : ${rider.riderName}`);
    console.log(`✔ Source     : ${tableName}`);
    console.log(`✔ Plan       : ${planNumber}`);
    console.log(`✔ Age Range  : 18 - 50`);
    console.log(`✔ Rider Terms: 7, 8, 9, 10, 11, 12, 13, 14, 15`);
    console.log(`✔ PPT        : NULL`);
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
