import { PrismaClient } from "@prisma/client";
import Database from "better-sqlite3";

export const seedPremiumRates774 = async (prisma: PrismaClient) => {
  const sqlite = new Database("./prisma/Creations.db", {
    readonly: true,
  });

  const planNumber = "774";

  const optionTables = [
    {
      tableName: "tp_774_1",
      option: 1,
    },
    {
      tableName: "tp_774_2",
      option: 2,
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

  console.log(
    `Matched Product: ${product.productName} (${product.planNumber})`
  );

  let totalInserted = 0;
  let totalSkipped = 0;

  for (const { tableName, option } of optionTables) {
    console.log("\n=================================");
    console.log(
      `Processing ${tableName} → Option ${option}`
    );

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

    const termColumns = Object.keys(
      premiumRows[0] ?? {}
    ).filter((key) => /^T\d+_\d+$/.test(key));

    console.log(
      `Premium columns: ${termColumns.join(", ")}`
    );

    let inserted = 0;
    let skipped = 0;

    for (const row of premiumRows) {
      const entryAge = Number(row.Age);

      if (Number.isNaN(entryAge)) {
        console.log(
          `⚠️ Invalid age: ${row.Age}`
        );

        continue;
      }

      for (const column of termColumns) {
        const match = column.match(
          /^T(\d+)_(\d+)$/
        );

        if (!match) {
          continue;
        }

        const policyTerm = Number(match[1]);
        const premiumPayingTerm = Number(match[2]);

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
            secondaryAge: null,
            policyTerm,
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

    console.log(
      `✔ Option    : ${option}`
    );

    console.log(
      `✔ Inserted  : ${inserted}`
    );

    console.log(
      `✔ Skipped   : ${skipped}`
    );
  }

  console.log("\n=================================");
  console.log(
    `✔ Plan Number : ${product.planNumber}`
  );
  console.log(
    `✔ Product     : ${product.productName}`
  );
  console.log(
    `✔ Options     : 1, 2`
  );
  console.log(
    `✔ Policy Term : 10 - 25`
  );
  console.log(
    `✔ PPT Range   : 5 - 7`
  );
  console.log(
    `✔ Inserted    : ${totalInserted}`
  );
  console.log(
    `✔ Skipped     : ${totalSkipped}`
  );
  console.log("=================================");

  sqlite.close();
};
