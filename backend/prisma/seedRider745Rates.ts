import { PrismaClient } from "@prisma/client";
import Database from "better-sqlite3";

export const seedRiderPremium745 = async (prisma: PrismaClient) => {
  const sqlite = new Database("./prisma/Creations.db", {
    readonly: true,
  });

  const tableName = "TermRider_745";
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
      console.log(
        `❌ Rider with code ${riderCode} not found in RiderMaster`
      );
      return;
    }

    console.log(
      `Matched Rider: ${rider.riderName} (${rider.riderCode})`
    );

    const product = await prisma.productMaster.findFirst({
      where: {
        planNumber: "745",
      },
    });

    if (!product) {
      console.log(
        `❌ Product with planNumber 745 not found in ProductMaster`
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

    if (premiumRows.length === 0) {
      console.log(`❌ No data found in ${tableName}`);
      return;
    }

    // T15, T20, T25, T30 represent PPT
    const pptColumns = Object.keys(premiumRows[0])
      .filter((key) => /^T(15|20|25|30)$/.test(key))
      .sort((a, b) => {
        const pptA = Number(a.substring(1));
        const pptB = Number(b.substring(1));

        return pptA - pptB;
      });

    console.log("PPT columns:", pptColumns);

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
          `⚠️ Invalid Rider_Term for Age ${entryAge}: ${row.Rider_Term}`
        );
        invalid++;
        continue;
      }

      for (const column of pptColumns) {
        const match = column.match(/^T(\d+)$/);

        if (!match) {
          continue;
        }

        // T15 -> PPT 15
        // T20 -> PPT 20
        // T25 -> PPT 25
        // T30 -> PPT 30
        const premiumPayingTerm = Number(match[1]);

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

        /*
         * For Plan 745:
         *
         * Age          -> entryAge
         * Rider_Term   -> riderTerm
         * T15          -> premiumPayingTerm 15
         * T20          -> premiumPayingTerm 20
         * T25          -> premiumPayingTerm 25
         * T30          -> premiumPayingTerm 30
         */

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

        if (existing) {
          const existingRate = Number(existing.ratePerThousand);

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
              `♻ Updated 745 Rate: Age ${entryAge}, Term ${riderTerm}, PPT ${premiumPayingTerm} | Old Rate: ${existingRate} | New Rate: ${rate}`
            );
          }

          continue;
        }

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
          `➕ Inserted 745 Rate: Age ${entryAge}, Term ${riderTerm}, PPT ${premiumPayingTerm}, Rate ${rate}`
        );
      }
    }

    console.log("\n=================================");
    console.log(`✔ Rider Code : ${rider.riderCode}`);
    console.log(`✔ Rider Name : ${rider.riderName}`);
    console.log(`✔ Source     : ${tableName}`);
    console.log(`✔ Plan       : 745`);
    console.log(`✔ Plan Type  : Whole Life`);
    console.log(`✔ Age Range  : 18 - 55`);
    console.log(`✔ Rider Term : From Rider_Term`);
    console.log(`✔ PPT Range  : 15, 20, 25, 30`);
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
