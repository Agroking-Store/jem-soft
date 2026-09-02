import { PrismaClient } from "@prisma/client";
import Database from "better-sqlite3";

export const seedPremiumRatesStandard = async (prisma: PrismaClient) => {
  const sqlite = new Database("./prisma/Creations.db", {
    readonly: true,
  });

  // Get all premium tables
  const tables = sqlite
    .prepare(`
      SELECT name
      FROM sqlite_master
      WHERE type='table'
      AND name LIKE 'table_%'
    `)
    .all() as { name: string }[];

  console.log(`Found ${tables.length} tables`);

  for (const table of tables) {
    const planNumber = table.name.replace("table_", "");

    // Skip invalid tables
    if (!/^\d+$/.test(planNumber)) {
      console.log(`Skipping ${table.name}`);
      continue;
    }

    const premiumRows = sqlite
      .prepare(`SELECT * FROM ${table.name}`)
      .all() as any[];

    console.log(
      `\nProcessing ${table.name} (${premiumRows.length} rows)`
    );

    const product = await prisma.productMaster.findFirst({
      where: {
        planNumber,
      },
    });

    if (!product) {
      console.log(`Plan ${planNumber} not found in ProductMaster`);
      continue;
    }

    console.log(`Matched Product: ${product.productName}`);

    let inserted = 0;
    let skipped = 0;

    for (const row of premiumRows) {
      const entryAge = Number(row.Age);

      // Automatically detect all term columns (T15, T16, T21, T25, etc.)
      const termColumns = Object.keys(row).filter(
        (key) => /^T\d+$/.test(key)
      );

      for (const column of termColumns) {
        const policyTerm = Number(column.substring(1));

        const rate = row[column];

        if (
          rate === null ||
          rate === undefined ||
          rate === ""
        ) {
          continue;
        }

        const existing =
          await prisma.productPremiumRate.findFirst({
            where: {
              productId: product.id,
              entryAge,
              policyTerm,
              premiumPayingTerm: null,
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
            policyTerm,
            premiumPayingTerm: null,
            tabularRate: Number(rate),
          },
        });

        inserted++;
      }
    }

    console.log(
      `✔ ${product.planNumber} - ${product.productName}`
    );
    console.log(`Inserted : ${inserted}`);
    console.log(`Skipped  : ${skipped}`);
  }

  sqlite.close();
};
