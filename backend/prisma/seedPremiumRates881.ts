import { PrismaClient } from "@prisma/client";
import Database from "better-sqlite3";

export const seedPremiumRates881 = async (prisma: PrismaClient) => {
  const sqlite = new Database("./prisma/Creations.db", {
    readonly: true,
  });

  const planNumber = "881";
  const POLICY_TERM = 25;

  const optionTables = [
    {
      tableName: "table_881_a",
      option: 1,
    },
    {
      tableName: "table_881_b",
      option: 2,
    },
    {
      tableName: "table_881_c",
      option: 3,
    },
  ];

  const product = await prisma.productMaster.findFirst({
    where: {
      planNumber,
    },
  });

  if (!product) {
    console.log(
      `❌ Plan ${planNumber} not found in ProductMaster`
    );

    sqlite.close();
    return;
  }

  console.log("\n=================================");
  console.log(`✔ Product     : ${product.productName}`);
  console.log(`✔ Plan Number : ${product.planNumber}`);
  console.log(`✔ Policy Term : ${POLICY_TERM}`);
  console.log(`✔ Options     : 1, 2, 3`);
  console.log("=================================\n");

  let totalInserted = 0;
  let totalSkipped = 0;

  for (const { tableName, option } of optionTables) {
    console.log("\n---------------------------------");
    console.log(`Processing ${tableName}`);
    console.log(`Option: ${option}`);
    console.log("---------------------------------");

    const tableExists = sqlite
      .prepare(
        `
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
          AND name = ?
        `
      )
      .get(tableName);

    if (!tableExists) {
      console.log(
        `⚠️ Table ${tableName} not found`
      );

      continue;
    }

    const premiumRows = sqlite
      .prepare(`SELECT * FROM "${tableName}"`)
      .all() as any[];

    console.log(
      `Rows found: ${premiumRows.length}`
    );

    if (premiumRows.length === 0) {
      console.log(
        `⚠️ No rows found in ${tableName}`
      );

      continue;
    }

    const pptColumns = Object.keys(
      premiumRows[0] ?? {}
    ).filter((key) => /^T\d+$/.test(key));

    console.log(
      `PPT Columns: ${pptColumns.join(", ")}`
    );

    let inserted = 0;
    let skipped = 0;

    for (const row of premiumRows) {
      const entryAge = Number(row.Age);

      if (
        Number.isNaN(entryAge) ||
        entryAge <= 0
      ) {
        console.log(
          `⚠️ Invalid age: ${row.Age}`
        );

        continue;
      }

      for (const column of pptColumns) {
        const match = column.match(/^T(\d+)$/);

        if (!match) {
          continue;
        }

        const premiumPayingTerm = Number(
          match[1]
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
              secondaryAge: null,
              policyTerm: POLICY_TERM,
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
            secondaryAge: null,
            policyTerm: POLICY_TERM,
            premiumPayingTerm,
            option,
            tabularRate: rate,
          },
        });

        inserted++;
      }
    }

    totalInserted += inserted;
    totalSkipped += skipped;

    console.log("\n✔ Table completed");
    console.log(`  Table    : ${tableName}`);
    console.log(`  Option   : ${option}`);
    console.log(`  Inserted : ${inserted}`);
    console.log(`  Skipped  : ${skipped}`);
  }

  console.log("\n=================================");
  console.log(`✔ Plan       : ${product.planNumber}`);
  console.log(`✔ Product    : ${product.productName}`);
  console.log(`✔ Options    : 1, 2, 3`);
  console.log(`✔ Policy Term: ${POLICY_TERM}`);
  console.log(`✔ PPT Range  : 7 - 15`);
  console.log(`✔ Inserted   : ${totalInserted}`);
  console.log(`✔ Skipped    : ${totalSkipped}`);
  console.log("=================================\n");

  sqlite.close();
};
