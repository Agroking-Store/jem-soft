import { PrismaClient } from "@prisma/client";
import Database from "better-sqlite3";

export const seedRiderPremium912 = async (prisma: PrismaClient) => {
  const sqlite = new Database("./prisma/Creations.db", {
    readonly: true,
  });

  const tableName = "TermRider_912";
  const riderCode = "TERM";
  const planNumber = "912";

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
    // Find Plan 912 product
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
    // Plan 912 column format
    //
    // T10_6  -> Rider Term 10, PPT 6
    // T10_8  -> Rider Term 10, PPT 8
    // T12_10 -> Rider Term 12, PPT 10
    // T15_12 -> Rider Term 15, PPT 12
    // T20_15 -> Rider Term 20, PPT 15
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
      // Process Rider Term + PPT combinations
      // ------------------------------------------------
      for (const column of rateColumns) {
        const match = column.match(/^T(\d+)_(\d+)$/);

        if (!match) {
          continue;
        }

        // Example:
        //
        // T18_12
        //
        // match[1] = 18 -> Rider Term
        // match[2] = 12 -> PPT

        const riderTerm = Number(match[1]);
        const premiumPayingTerm = Number(match[2]);

        const rate = Number(row[column]);

        // ------------------------------------------------
        // Skip empty / NULL / zero / invalid values
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
         * Plan 912 mapping:
         *
         * Age -> entryAge
         *
         * T10_6
         *    10 -> riderTerm
         *     6 -> premiumPayingTerm
         *
         * T20_15
         *    20 -> riderTerm
         *    15 -> premiumPayingTerm
         *
         * option -> null
         */

        // ------------------------------------------------
        // Check existing Plan 912 record
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

          // Same value -> skip
          if (existingRate === rate) {
            skipped++;
          } else {
            // Different value -> update
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
              `♻ Updated 912 Rate: Age ${entryAge}, Term ${riderTerm}, PPT ${premiumPayingTerm} | Old Rate: ${existingRate} | New Rate: ${rate}`,
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
          `➕ Inserted 912 Rate: Age ${entryAge}, Term ${riderTerm}, PPT ${premiumPayingTerm}, Rate ${rate}`,
        );
      }
    }

    // --------------------------------------------------
    // Summary
    // --------------------------------------------------
    console.log("\n=================================");
    console.log("       PLAN 912 RIDER SEED");
    console.log("=================================");
    console.log(`✔ Rider Code : ${rider.riderCode}`);
    console.log(`✔ Rider Name : ${rider.riderName}`);
    console.log(`✔ Source     : ${tableName}`);
    console.log(`✔ Plan       : ${planNumber}`);
    console.log(`✔ Age Range  : 18 - 60`);
    console.log(`✔ Rider Terms: 10 - 20`);
    console.log(`✔ PPT Values : 6, 8, 10, 12, 15`);
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
