import { PrismaClient } from "@prisma/client";
import Database from "better-sqlite3";

export const seedRiderPremium720 = async (
  prisma: PrismaClient
) => {
  const sqlite = new Database("./prisma/Creations.db", {
    readonly: true,
  });

  const tableName = "TermRider_720";
  const riderCode = "TERM";
  const planNumber = "720";

  try {
    // ==================================================
    // READ SQLITE DATA
    // ==================================================
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

    // ==================================================
    // FIND RIDER
    // ==================================================
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
      `✔ Matched Rider: ${rider.riderName} (${rider.riderCode})`
    );

    // ==================================================
    // FIND PRODUCT
    // ==================================================
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
      `✔ Matched Product: ${product.productName} (Plan ${product.planNumber})`
    );

    console.log(`✔ Product ID: ${product.id}`);

    // ==================================================
    // COUNTERS
    // ==================================================
    let inserted = 0;
    let skipped = 0;
    let updated = 0;
    let invalid = 0;

    // ==================================================
    // DETECT TERM COLUMNS
    // ==================================================
    const termColumns = Object.keys(premiumRows[0])
      .filter((key) => /^T\d+$/.test(key))
      .sort((a, b) => {
        const termA = Number(a.substring(1));
        const termB = Number(b.substring(1));

        return termA - termB;
      });

    console.log("Term columns:", termColumns);

    // ==================================================
    // PROCESS EACH ROW
    // ==================================================
    for (const row of premiumRows) {
      const entryAge = Number(row.Age);

      if (Number.isNaN(entryAge)) {
        invalid++;

        console.log(
          `⚠️ Invalid age: ${row.Age}`
        );

        continue;
      }

      // ==================================================
      // PROCESS EACH RIDER TERM
      // ==================================================
      for (const column of termColumns) {
        const match = column.match(/^T(\d+)$/);

        if (!match) {
          continue;
        }

        // Example:
        // T20 -> riderTerm = 20
        const riderTerm = Number(match[1]);

        const rate = Number(row[column]);

        // ==================================================
        // SKIP INVALID RATE
        // ==================================================
        if (
          row[column] == null ||
          row[column] === "" ||
          rate === 0 ||
          Number.isNaN(rate)
        ) {
          continue;
        }

        // ==================================================
        // FIND EXISTING PLAN-SPECIFIC RECORD
        //
        // productId separates Plan 720 from other plans.
        //
        // Plan 720 does NOT depend on PPT.
        // Therefore PPT must remain NULL.
        // ==================================================
        const existing =
          await prisma.riderPremiumRate.findFirst({
            where: {
              productId: product.id,
              riderId: rider.id,
              entryAge,
              riderTerm,
              premiumPayingTerm: null,
              option: null,
            },
          });

        // ==================================================
        // EXISTING RECORD
        // ==================================================
        if (existing) {
          const existingRate =
            Number(existing.ratePerThousand);

          if (existingRate === rate) {
            skipped++;
          } else {
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
              `♻ Updated 720 Rate: Age ${entryAge}, Term ${riderTerm} | Old Rate: ${existingRate} | New Rate: ${rate}`
            );
          }

          continue;
        }

        // ==================================================
        // CREATE NEW RECORD
        // ==================================================
        await prisma.riderPremiumRate.create({
          data: {
            productId: product.id,
            riderId: rider.id,
            entryAge,
            riderTerm,

            // Plan 720 is NOT PPT-specific
            premiumPayingTerm: null,

            ratePerThousand: rate,
            option: null,
          },
        });

        inserted++;
      }
    }

    // ==================================================
    // SUMMARY
    // ==================================================
    console.log("\n=================================");
    console.log("       PLAN 720 RIDER SEED");
    console.log("=================================");
    console.log(`✔ Plan        : ${planNumber}`);
    console.log(`✔ Product ID  : ${product.id}`);
    console.log(`✔ Rider Code  : ${rider.riderCode}`);
    console.log(`✔ Rider Name  : ${rider.riderName}`);
    console.log(`✔ Source      : ${tableName}`);
    console.log(`✔ Age Range   : 18 - 50`);
    console.log(`✔ Term Range  : T20`);
    console.log(`✔ PPT         : NULL`);
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
