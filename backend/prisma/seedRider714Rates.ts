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
  const planNumber = "714";

  try {
    const premiumRows = sqlite
      .prepare(`SELECT * FROM "${tableName}"`)
      .all() as any[];

    console.log(
      `Processing ${tableName} (${premiumRows.length} rows)`
    );

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

    // Find product
    const product = await prisma.productMaster.findFirst({
      where: {
        planNumber,
      },
    });

    if (!product) {
      console.log(
        `❌ Product with planNumber ${planNumber} not found`
      );
      return;
    }

    console.log(
      `Matched Product: ${product.productName} (Plan ${product.planNumber})`
    );

    let inserted = 0;
    let skipped = 0;
    let invalid = 0;

    if (premiumRows.length === 0) {
      console.log(`❌ No data found in ${tableName}`);
      return;
    }

    const termColumns = Object.keys(premiumRows[0]).filter(
      (key) => /^T\d+$/.test(key)
    );

    console.log("Term columns:", termColumns);

    for (const row of premiumRows) {
      const entryAge = Number(row.Age);

      if (Number.isNaN(entryAge)) {
        invalid++;
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

        if (
          row[column] == null ||
          row[column] === "" ||
          rate === 0 ||
          Number.isNaN(rate)
        ) {
          continue;
        }

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

        if (existing) {
          skipped++;
          continue;
        }

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
      }
    }

    console.log("\n=================================");
    console.log(`✔ Plan       : ${planNumber}`);
    console.log(`✔ Rider Code : ${rider.riderCode}`);
    console.log(`✔ Rider Name : ${rider.riderName}`);
    console.log(`✔ Source     : ${tableName}`);
    console.log(`✔ Term Range : T12 - T35`);
    console.log(`✔ PPT        : NULL`);
    console.log(`✔ Inserted   : ${inserted}`);
    console.log(`✔ Skipped    : ${skipped}`);
    console.log(`✔ Invalid    : ${invalid}`);
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