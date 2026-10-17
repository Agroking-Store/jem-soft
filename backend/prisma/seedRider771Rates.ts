import { PrismaClient } from "@prisma/client";
import Database from "better-sqlite3";

export const seedRiderPremium771 = async (prisma: PrismaClient) => {
  const sqlite = new Database("./prisma/Creations.db", {
    readonly: true,
  });

  const tableName = "TermRider_771";
  const riderCode = "TERM";
  const planNumber = "771";

  try {
    // --------------------------------------------------
    // Read SQLite data
    // --------------------------------------------------
    const premiumRows = sqlite
      .prepare(`SELECT * FROM "${tableName}"`)
      .all() as any[];

    console.log(`Processing ${tableName} (${premiumRows.length} rows)`);

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
    // Find Plan 771 product
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
    // Validate source data
    // --------------------------------------------------
    if (premiumRows.length === 0) {
      console.log(`❌ No data found in ${tableName}`);
      return;
    }

    // --------------------------------------------------
    // Plan 771
    //
    // T5  -> PPT 5
    // T6  -> PPT 6
    // T7  -> PPT 7
    // T8  -> PPT 8
    // T9  -> PPT 9
    // T10 -> PPT 10
    // T11 -> PPT 11
    // T12 -> PPT 12
    // T13 -> PPT 13
    // T14 -> PPT 14
    // T15 -> PPT 15
    // T16 -> PPT 16
    // --------------------------------------------------
    const allowedPPTs = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];

    const pptColumns = Object.keys(premiumRows[0])
      .filter((key) => {
        const match = key.match(/^T(\d+)$/);

        if (!match) {
          return false;
        }

        return allowedPPTs.includes(Number(match[1]));
      })
      .sort((a, b) => {
        const pptA = Number(a.substring(1));
        const pptB = Number(b.substring(1));

        return pptA - pptB;
      });

    console.log("PPT columns:", pptColumns);

    // --------------------------------------------------
    // Process rows
    // --------------------------------------------------
    for (const row of premiumRows) {
      const entryAge = Number(row.Age);
      const riderTerm = Number(row.Rider_Term);

      // Validate Age
      if (Number.isNaN(entryAge)) {
        console.log(`⚠️ Invalid age: ${row.Age}`);
        invalid++;
        continue;
      }

      // Validate Rider Term
      if (Number.isNaN(riderTerm)) {
        console.log(
          `⚠️ Invalid Rider_Term for Age ${entryAge}: ${row.Rider_Term}`,
        );
        invalid++;
        continue;
      }

      // ------------------------------------------------
      // Process PPT columns
      // ------------------------------------------------
      for (const column of pptColumns) {
        const match = column.match(/^T(\d+)$/);

        if (!match) {
          continue;
        }

        const premiumPayingTerm = Number(match[1]);
        const rate = Number(row[column]);

        // ------------------------------------------------
        // Skip empty / NULL / zero / invalid rates
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
         * Plan 771 mapping:
         *
         * Age        -> entryAge
         * Rider_Term -> riderTerm
         *
         * T5  -> premiumPayingTerm 5
         * T6  -> premiumPayingTerm 6
         * T7  -> premiumPayingTerm 7
         * T8  -> premiumPayingTerm 8
         * T9  -> premiumPayingTerm 9
         * T10 -> premiumPayingTerm 10
         * T11 -> premiumPayingTerm 11
         * T12 -> premiumPayingTerm 12
         * T13 -> premiumPayingTerm 13
         * T14 -> premiumPayingTerm 14
         * T15 -> premiumPayingTerm 15
         * T16 -> premiumPayingTerm 16
         */

        // ------------------------------------------------
        // Check existing Plan 771 rate
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
              `♻ Updated 771 Rate: Age ${entryAge}, Term ${riderTerm}, PPT ${premiumPayingTerm} | Old Rate: ${existingRate} | New Rate: ${rate}`,
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
          `➕ Inserted 771 Rate: Age ${entryAge}, Term ${riderTerm}, PPT ${premiumPayingTerm}, Rate ${rate}`,
        );
      }
    }

    // --------------------------------------------------
    // Summary
    // --------------------------------------------------
    console.log("\n=================================");
    console.log("       PLAN 771 RIDER SEED");
    console.log("=================================");
    console.log(`✔ Rider Code : ${rider.riderCode}`);
    console.log(`✔ Rider Name : ${rider.riderName}`);
    console.log(`✔ Source     : ${tableName}`);
    console.log(`✔ Plan       : ${planNumber}`);
    console.log(`✔ Age Range  : 18 - 60`);
    console.log(`✔ Rider Term : From Rider_Term`);
    console.log(`✔ PPT Range  : 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16`);
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
