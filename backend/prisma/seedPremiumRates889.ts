import { PrismaClient } from "@prisma/client";
import Database from "better-sqlite3";

export const seedPremiumRates889 = async (prisma: PrismaClient) => {
  const sqlite = new Database("./prisma/Creations.db", {
    readonly: true,
  });

  const planNumber = "889";

  const tables = sqlite
    .prepare(`
      SELECT name
      FROM sqlite_master
      WHERE type = 'table'
        AND name GLOB 'table_889_*'
    `)
    .all() as { name: string }[];

  console.log(`Found ${tables.length} Plan ${planNumber} tables`);

  const product = await prisma.productMaster.findFirst({
    where: {
      planNumber,
    },
  });

  if (!product) {
    console.log(`❌ Plan ${planNumber} not found in ProductMaster`);
    sqlite.close();
    return;
  }

  console.log(
    `Matched Product: ${product.productName} (${product.planNumber})`
  );

  let inserted = 0;
  let skipped = 0;

  for (const table of tables) {
    const match = table.name.match(
      /^table_889_(\d+)_(\d+)_(\d+)$/
    );

    if (!match) {
      console.log(`⚠️ Skipping invalid table: ${table.name}`);
      continue;
    }

    const policyTerm = Number(match[1]);
    const premiumPayingTerm = Number(match[2]);
    const option = Number(match[3]);

    console.log(
      `\nProcessing ${table.name} → ` +
      `Term ${policyTerm}, ` +
      `PPT ${premiumPayingTerm}, ` +
      `Option ${option}`
    );

    const rows = sqlite
      .prepare(`SELECT * FROM "${table.name}"`)
      .all() as any[];

    if (rows.length === 0) {
      console.log(`⚠️ No rows found in ${table.name}`);
      continue;
    }

    const secondaryAgeColumns = Object.keys(
      rows[0] ?? {}
    ).filter((key) => /^T\d+$/.test(key));

    console.log(
      `Secondary age columns: ${secondaryAgeColumns.join(", ")}`
    );

    for (const row of rows) {
      const entryAge = Number(row.Age);

      if (
        Number.isNaN(entryAge) ||
        entryAge < 18 ||
        entryAge > 60
      ) {
        console.log(
          `⚠️ Invalid primary age: ${row.Age}`
        );
        continue;
      }

      for (const column of secondaryAgeColumns) {
        const secondaryAge = Number(
          column.substring(1)
        );

        const rawRate = row[column];

        if (
          rawRate == null ||
          rawRate === "" ||
          Number.isNaN(Number(rawRate)) ||
          Number(rawRate) === 0
        ) {
          continue;
        }

        const rate = Number(rawRate);

        const existing =
          await prisma.productPremiumRate.findFirst({
            where: {
              productId: product.id,
              entryAge,
              secondaryAge,
              policyTerm,
              premiumPayingTerm,
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
            premiumPayingTerm,
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
  console.log(`✔ Tables     : ${tables.length}`);
  console.log(`✔ Inserted   : ${inserted}`);
  console.log(`✔ Skipped    : ${skipped}`);
  console.log("=================================");

  sqlite.close();
};
