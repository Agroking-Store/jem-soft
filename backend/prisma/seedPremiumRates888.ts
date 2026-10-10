import { PrismaClient } from "@prisma/client";
import Database from "better-sqlite3";

export const seedPremiumRates888 = async (prisma: PrismaClient) => {
  const sqlite = new Database("./prisma/Creations.db", {
    readonly: true,
  });

  const planNumber = "888";

  const tables = sqlite
    .prepare(`
      SELECT name
      FROM sqlite_master
      WHERE type = 'table'
        AND name GLOB 'table_888_*'
    `)
    .all() as { name: string }[];

  console.log(`Found ${tables.length} Plan 888 tables`);

  const product = await prisma.productMaster.findFirst({
    where: {
      planNumber,
    },
  });

  if (!product) {
    console.log(`❌ Plan ${planNumber} not found`);
    sqlite.close();
    return;
  }

  console.log(
    `Matched Product: ${product.productName} (${product.planNumber})`
  );

  let inserted = 0;
  let skipped = 0;

  for (const table of tables) {
    const match = table.name.match(/^table_888_(\d+)_(\d+)$/);

    if (!match) {
      console.log(`Skipping ${table.name}`);
      continue;
    }

    const policyTerm = Number(match[1]);
    const option = Number(match[2]);

    console.log(
      `\nProcessing ${table.name} → Term ${policyTerm}, Option ${option}`
    );

    const rows = sqlite
      .prepare(`SELECT * FROM "${table.name}"`)
      .all() as any[];

    const secondaryAgeColumns = Object.keys(rows[0] ?? {}).filter(
      (key) => /^T\d+$/.test(key)
    );

    for (const row of rows) {
      const entryAge = Number(row.Age);

      if (Number.isNaN(entryAge)) {
        continue;
      }

      for (const column of secondaryAgeColumns) {
        const secondaryAge = Number(column.substring(1));
        const rate = Number(row[column]);

        if (
          row[column] == null ||
          row[column] === "" ||
          Number.isNaN(rate) ||
          rate === 0
        ) {
          continue;
        }

        const existing =
          await prisma.productPremiumRate.findFirst({
            where: {
              productId: product.id,
              entryAge,
              secondaryAge,
              policyTerm,
              premiumPayingTerm: null,
              option,
            },
          });

        if (existing) {
          skipped++;
          continue;
        }

        await prisma.productPremiumRate.create({
          data: {
            productId: product.id,
            entryAge,
            secondaryAge,
            policyTerm,
            premiumPayingTerm: null,
            option,
            tabularRate: rate,
          },
        });

        inserted++;
      }
    }
  }

  console.log("\n=================================");
  console.log(`✔ Plan       : ${product.planNumber}`);
  console.log(`✔ Product    : ${product.productName}`);
  console.log(`✔ Inserted   : ${inserted}`);
  console.log(`✔ Skipped    : ${skipped}`);
  console.log("=================================");

  sqlite.close();
};
