import { PrismaClient } from "@prisma/client";
import Database from "better-sqlite3";

export const seedRiderPremium883 = async (prisma: PrismaClient) => {
  const sqlite = new Database("./prisma/Creations.db", {
    readonly: true,
  });

  const tableName = "TermRider_883";
  const riderCode = "TERM";
  const planNumber = "883";

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
    // Find Plan 883 product
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
    // Plan 883
    //
    // Age        -> Entry Age
    // Rider_Term -> Rider Term
    // T1         -> Premium Paying Term 1
    // --------------------------------------------------
    const premiumPayingTerm = 1;

    // --------------------------------------------------
    // Process rows
    // --------------------------------------------------
    for (const row of premiumRows) {
      const entryAge = Number(row.Age);
      const riderTerm = Number(row.Rider_Term);
      const rate = Number(row.T1);

      // ------------------------------------------------
      // Validate Age
      // ------------------------------------------------
      if (Number.isNaN(entryAge)) {
        console.log(`⚠️ Invalid age: ${row.Age}`);
        invalid++;
        continue;
      }

      // ------------------------------------------------
      // Validate Rider Term
      // ------------------------------------------------
      if (Number.isNaN(riderTerm)) {
        console.log(
          `⚠️ Invalid Rider_Term for Age ${entryAge}: ${row.Rider_Term}`,
        );
        invalid++;
        continue;
      }

      // ------------------------------------------------
      // Skip empty / zero / invalid rate
      // ------------------------------------------------
      if (row.T1 == null || row.T1 === "" || rate === 0 || Number.isNaN(rate)) {
        continue;
      }

      /*
       * Plan 883 mapping:
       *
       * Age        -> entryAge
       * Rider_Term -> riderTerm
       * T1         -> premiumPayingTerm 1
       *
       * option -> null
       */

      // ------------------------------------------------
      // Check existing Plan 883 record
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
            `♻ Updated 883 Rate: Age ${entryAge}, Term ${riderTerm}, PPT ${premiumPayingTerm} | Old Rate: ${existingRate} | New Rate: ${rate}`,
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
        `➕ Inserted 883 Rate: Age ${entryAge}, Term ${riderTerm}, PPT ${premiumPayingTerm}, Rate ${rate}`,
      );
    }

    // --------------------------------------------------
    // Summary
    // --------------------------------------------------
    console.log("\n=================================");
    console.log("       PLAN 883 RIDER SEED");
    console.log("=================================");
    console.log(`✔ Rider Code : ${rider.riderCode}`);
    console.log(`✔ Rider Name : ${rider.riderName}`);
    console.log(`✔ Source     : ${tableName}`);
    console.log(`✔ Plan       : ${planNumber}`);
    console.log(`✔ Age Range  : 18 - 60`);
    console.log(`✔ Rider Term : From Rider_Term`);
    console.log(`✔ PPT        : 1`);
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
