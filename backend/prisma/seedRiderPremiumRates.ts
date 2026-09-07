import { PrismaClient } from "@prisma/client";
import Database from "better-sqlite3";

export const seedRiderPremium714 = async (
  prisma: PrismaClient
) => {
  const sqlite = new Database("./prisma/Creations.db", {
    readonly: true,
  });

  const tableName = "TermRider_714";
  const riderCode = "TERM";

  try {
    const premiumRows = sqlite
      .prepare(`SELECT * FROM "${tableName}"`)
      .all() as any[];

    console.log(
      `Processing ${tableName} (${premiumRows.length} rows)`
    );

    // Find rider
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

    let inserted = 0;
    let skipped = 0;

    if (premiumRows.length === 0) {
      console.log(`❌ No data found in ${tableName}`);
      return;
    }

    // Detect columns like T12, T13, T14 ... T35
    const termColumns = Object.keys(premiumRows[0]).filter(
      (key) => /^T\d+$/.test(key)
    );

    console.log("Term columns:", termColumns);

    for (const row of premiumRows) {
      const entryAge = Number(row.Age);

      if (Number.isNaN(entryAge)) {
        console.log(`⚠️ Invalid age: ${row.Age}`);
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

        const existing =
          await prisma.riderPremiumRate.findUnique({
            where: {
              riderId_entryAge_riderTerm: {
                riderId: rider.id,
                entryAge,
                riderTerm,
              },
            },
          });

        if (existing) {
          skipped++;
          continue;
        }

        await prisma.riderPremiumRate.create({
          data: {
            riderId: rider.id,
            entryAge,
            riderTerm,
            ratePerThousand: rate,
          },
        });

        inserted++;
      }
    }

    console.log("\n=================================");
    console.log(`✔ Rider Code : ${rider.riderCode}`);
    console.log(`✔ Rider Name : ${rider.riderName}`);
    console.log(`✔ Source     : ${tableName}`);
    console.log(`✔ Term Range : T12 - T35`);
    console.log(`✔ Inserted   : ${inserted}`);
    console.log(`✔ Skipped    : ${skipped}`);
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