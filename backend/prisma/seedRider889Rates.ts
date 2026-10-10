import { PrismaClient } from "@prisma/client";
import Database from "better-sqlite3";

export const seedRiderPremium889 = async (prisma: PrismaClient) => {
  const sqlite = new Database("./prisma/Creations.db", {
    readonly: true,
  });

  const tableName = "TermRider_889";
  const riderCode = "TERM";
  const planNumber = "889";

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
    // Find Plan 889 product
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
    // Plan 889 column mapping
    //
    // T10_5  -> Rider Term 10, PPT 5
    //
    // T15_5  -> Rider Term 15, PPT 5
    // T15_10 -> Rider Term 15, PPT 10
    //
    // T20_5  -> Rider Term 20, PPT 5
    // T20_10 -> Rider Term 20, PPT 10
    // T20_15 -> Rider Term 20, PPT 15
    //
    // T25_5  -> Rider Term 25, PPT 5
    // T25_10 -> Rider Term 25, PPT 10
    // T25_15 -> Rider Term 25, PPT 15
    // --------------------------------------------------

    const rateColumns = Object.keys(premiumRows[0])
      .filter((key) => /^T\d+_\d+$/.test(key))
      .sort((a, b) => {
        const matchA = a.match(/^T(\d+)_(\d+)$/);
        const matchB = b.match(/^T(\d+)_(\d+)$/);

        if (!matchA || !matchB) {
          return 0;
        }

        const riderTermA = Number(matchA[1]);
        const riderTermB = Number(matchB[1]);

        if (riderTermA !== riderTermB) {
          return riderTermA - riderTermB;
        }

        const pptA = Number(matchA[2]);
        const pptB = Number(matchB[2]);

        return pptA - pptB;
      });

    console.log("Rider Rate columns:", rateColumns);

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
      // Process Rider Term + PPT combination
      // ------------------------------------------------
      for (const column of rateColumns) {
        const match = column.match(/^T(\d+)_(\d+)$/);

        if (!match) {
          continue;
        }

        // Example:
        // T20_10
        //
        // match[1] = 20 -> Rider Term
        // match[2] = 10 -> PPT

        const riderTerm = Number(match[1]);
        const premiumPayingTerm = Number(match[2]);

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
         * Plan 889 mapping:
         *
         * Age -> entryAge
         *
         * T10_5
         *    10 -> riderTerm
         *     5 -> premiumPayingTerm
         *
         * T20_15
         *    20 -> riderTerm
         *    15 -> premiumPayingTerm
         *
         * option -> null
         */

        // ------------------------------------------------
        // Check existing Plan 889 record
        // ------------------------------------------------
        const existing = await prisma.riderPremiumRate.findFirst({
          where: {
            productId: product.id,
            riderId: rider.id,
            entryAge,
            riderTerm,
            premiumPayingTerm,
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
              `♻ Updated 889 Rate: Age ${entryAge}, Term ${riderTerm}, PPT ${premiumPayingTerm} | Old Rate: ${existingRate} | New Rate: ${rate}`,
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
            premiumPayingTerm,
            ratePerThousand: rate,
            option: null,
          },
        });

        inserted++;

        console.log(
          `➕ Inserted 889 Rate: Age ${entryAge}, Term ${riderTerm}, PPT ${premiumPayingTerm}, Rate ${rate}`,
        );
      }
    }

    // --------------------------------------------------
    // Summary
    // --------------------------------------------------
    console.log("\n=================================");
    console.log("       PLAN 889 RIDER SEED");
    console.log("=================================");
    console.log(`✔ Rider Code : ${rider.riderCode}`);
    console.log(`✔ Rider Name : ${rider.riderName}`);
    console.log(`✔ Source     : ${tableName}`);
    console.log(`✔ Plan       : ${planNumber}`);
    console.log(`✔ Age Range  : 18 - 50`);
    console.log(`✔ Rider Terms: 10, 15, 20, 25`);
    console.log(`✔ PPT Values : 5, 10, 15`);
    console.log(`✔ Option     : NULL`);
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
