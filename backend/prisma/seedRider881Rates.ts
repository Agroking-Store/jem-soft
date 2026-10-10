import { PrismaClient } from "@prisma/client";
import Database from "better-sqlite3";

export const seedRiderPremium881 = async (prisma: PrismaClient) => {
  const sqlite = new Database("./prisma/Creations.db", {
    readonly: true,
  });

  const tableName = "TermRider_881";
  const riderCode = "TERM";
  const planNumber = "881";

  // Plan 881 has a fixed rider term of 25.
  const FIXED_RIDER_TERM = 25;

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

    // --------------------------------------------------
    // Validate source data
    // --------------------------------------------------

    if (premiumRows.length === 0) {
      console.log(`❌ No data found in ${tableName} `);
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
    // Find Plan 881 product
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

    let inserted = 0;
    let skipped = 0;
    let invalid = 0;
    let updated = 0;

    // --------------------------------------------------
    // Plan 881:
    //
    // T7  -> PPT 7
    // T8  -> PPT 8
    // T9  -> PPT 9
    // T10 -> PPT 10
    // T11 -> PPT 11
    // T12 -> PPT 12
    // T13 -> PPT 13
    // T14 -> PPT 14
    // T15 -> PPT 15
    //
    // Rider Term = 25
    //
    // IMPORTANT:
    // Options belong to Policy PremiumRate.
    // RiderPremiumRate does NOT use options.
    // Therefore option = NULL.
    // --------------------------------------------------

    const allowedPPTs = [
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
    ];

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

      // Validate Age
      if (Number.isNaN(entryAge)) {
        console.log(`⚠️ Invalid age: ${row.Age} `);
        invalid++;
        continue;
      }

      // ------------------------------------------------
      // Process each PPT
      // ------------------------------------------------

      for (const column of pptColumns) {
        const match = column.match(/^T(\d+)$/);

        if (!match) {
          continue;
        }

        // T7  -> PPT 7
        // T8  -> PPT 8
        // ...
        // T15 -> PPT 15
        const premiumPayingTerm = Number(match[1]);

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

        // ------------------------------------------------
        // Check existing RiderPremiumRate
        //
        // Unique combination:
        // Product
        // Rider
        // Age
        // Rider Term = 25
        // PPT
        //
        // Option is ALWAYS NULL.
        // ------------------------------------------------

        const existing = await prisma.riderPremiumRate.findFirst({
          where: {
            productId: product.id,
            riderId: rider.id,
            entryAge,

            // Fixed rider term
            riderTerm: FIXED_RIDER_TERM,

            // T7-T15 are PPT
            premiumPayingTerm,

            // Rider has no options
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
              `♻ Updated 881 Rate: ` +
              `Age ${entryAge}, ` +
              `Rider Term ${FIXED_RIDER_TERM}, ` +
              `PPT ${premiumPayingTerm} | ` +
              `Old Rate: ${existingRate} | ` +
              `New Rate: ${rate} `
            );
          }

          continue;
        }

        // ------------------------------------------------
        // Insert new RiderPremiumRate
        // ------------------------------------------------

        await prisma.riderPremiumRate.create({
          data: {
            productId: product.id,
            riderId: rider.id,

            // Entry age
            entryAge,

            // Fixed rider term = 25
            riderTerm: FIXED_RIDER_TERM,

            // T7-T15 = PPT
            premiumPayingTerm,

            // Rider premium rate
            ratePerThousand: rate,

            // NO OPTION FOR RIDER
            option: null,
          },
        });

        inserted++;

        console.log(
          `➕ Inserted 881 Rate: ` +
          `Age ${entryAge}, ` +
          `Rider Term ${FIXED_RIDER_TERM}, ` +
          `PPT ${premiumPayingTerm}, ` +
          `Rate ${rate} `
        );
      }
    }

    // --------------------------------------------------
    // Summary
    // --------------------------------------------------

    console.log("\n=================================");
    console.log("       PLAN 881 RIDER SEED");
    console.log("=================================");
    console.log(`✔ Rider Code: ${rider.riderCode} `);
    console.log(`✔ Rider Name: ${rider.riderName} `);
    console.log(`✔ Source: ${tableName} `);
    console.log(`✔ Plan: ${planNumber} `);
    console.log(`✔ Rider Term: ${FIXED_RIDER_TERM} `);
    console.log(`✔ Rate Basis: Age + PPT`);
    console.log(`✔ PPT: 7 - 15`);
    console.log(`✔ Rider Option: NULL`);
    console.log(`✔ Inserted: ${inserted} `);
    console.log(`✔ Skipped: ${skipped} `);
    console.log(`✔ Invalid: ${invalid} `);
    console.log(`♻ Updated: ${updated} `);
    console.log("=================================");

  } catch (error) {
    console.error(
      `❌ Error seeding ${tableName}: `,
      error
    );

    throw error;
  } finally {
    sqlite.close();
  }
};
