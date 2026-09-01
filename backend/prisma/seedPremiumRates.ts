/*import { PrismaClient } from "@prisma/client";
import Database from "better-sqlite3";

const prisma = new PrismaClient();

async function main() {
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
}

main()
  .then(async () => {
    console.log("\n✅ Premium seeding completed.");
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });*/

// =========================================================
// PLAN 881 PREMIUM SEED
//
// SQLite tables:
//
// table_881_a → Option 1
// table_881_b → Option 2
// table_881_c → Option 3
//
// Columns:
//
// T7  → Premium Paying Term 7
// T8  → Premium Paying Term 8
// ...
// T15 → Premium Paying Term 15
//
// Policy Term = 25
// =========================================================

import { PrismaClient } from "@prisma/client";
import Database from "better-sqlite3";

const prisma = new PrismaClient();

async function main() {
  const sqlite = new Database("./prisma/Creations.db", {
    readonly: true,
  });

  const planNumber = "881";
  const POLICY_TERM = 25;

  // ---------------------------------------------------------
  // Option table mapping
  // ---------------------------------------------------------

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

  // ---------------------------------------------------------
  // Find ProductMaster
  // ---------------------------------------------------------

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

  // =========================================================
  // Process Option Tables
  // =========================================================

  for (const { tableName, option } of optionTables) {
    console.log("\n---------------------------------");
    console.log(`Processing ${tableName}`);
    console.log(`Option: ${option}`);
    console.log("---------------------------------");

    // -------------------------------------------------------
    // Check whether table exists
    // -------------------------------------------------------

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

    // -------------------------------------------------------
    // Read SQLite table
    // -------------------------------------------------------

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

    // -------------------------------------------------------
    // Detect PPT columns
    //
    // T7, T8, T9 ... T15
    // -------------------------------------------------------

    const pptColumns = Object.keys(
      premiumRows[0] ?? {}
    ).filter((key) => /^T\d+$/.test(key));

    console.log(
      `PPT Columns: ${pptColumns.join(", ")}`
    );

    let inserted = 0;
    let skipped = 0;

    // =======================================================
    // Process each entry age
    // =======================================================

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

      // =====================================================
      // Process every PPT column
      // =====================================================

      for (const column of pptColumns) {
        const match = column.match(/^T(\d+)$/);

        if (!match) {
          continue;
        }

        const premiumPayingTerm = Number(
          match[1]
        );

        const rawRate = row[column];

        // ---------------------------------------------------
        // Skip empty / zero / invalid rates
        // ---------------------------------------------------

        if (
          rawRate == null ||
          rawRate === "" ||
          Number.isNaN(Number(rawRate)) ||
          Number(rawRate) === 0
        ) {
          continue;
        }

        const rate = Number(rawRate);

        // ---------------------------------------------------
        // Check duplicate
        //
        // Option MUST be part of duplicate check.
        // ---------------------------------------------------

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

        // ---------------------------------------------------
        // Insert premium rate
        // ---------------------------------------------------

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

  // =========================================================
  // Final Summary
  // =========================================================

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
}

main()
  .then(async () => {
    console.log(
      "✅ Plan 881 premium seeding completed."
    );

    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(
      "❌ Plan 881 seeding failed:",
      e
    );

    await prisma.$disconnect();

    process.exit(1);
  });


//774
/*import { PrismaClient } from "@prisma/client";
import Database from "better-sqlite3";

const prisma = new PrismaClient();

async function main() {
  const sqlite = new Database("./prisma/Creations.db", {
    readonly: true,
  });

  const planNumber = "774";

  // =========================================================
  // Plan 774
  //
  // tp_774_1 -> Option 1
  // tp_774_2 -> Option 2
  //
  // Column format:
  // T10_5 -> Policy Term 10, PPT 5
  // T10_6 -> Policy Term 10, PPT 6
  // T10_7 -> Policy Term 10, PPT 7
  //
  // ...
  //
  // T25_5 -> Policy Term 25, PPT 5
  // T25_6 -> Policy Term 25, PPT 6
  // T25_7 -> Policy Term 25, PPT 7
  // =========================================================

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

  // =========================================================
  // Find Product
  // =========================================================

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

  // =========================================================
  // Process Option 1 and Option 2
  // =========================================================

  for (const { tableName, option } of optionTables) {
    console.log("\n=================================");
    console.log(
      `Processing ${tableName} → Option ${option}`
    );

    // -------------------------------------------------------
    // Check table exists
    // -------------------------------------------------------

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

    // -------------------------------------------------------
    // Read SQLite data
    // -------------------------------------------------------

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

    // -------------------------------------------------------
    // Detect columns:
    //
    // T10_5
    // T10_6
    // T10_7
    // ...
    // T25_5
    // T25_6
    // T25_7
    // -------------------------------------------------------

    const termColumns = Object.keys(
      premiumRows[0] ?? {}
    ).filter((key) => /^T\d+_\d+$/.test(key));

    console.log(
      `Premium columns: ${termColumns.join(", ")}`
    );

    let inserted = 0;
    let skipped = 0;

    // =======================================================
    // Process every age
    // =======================================================

    for (const row of premiumRows) {
      const entryAge = Number(row.Age);

      if (Number.isNaN(entryAge)) {
        console.log(
          `⚠️ Invalid age: ${row.Age}`
        );

        continue;
      }

      // =====================================================
      // Process every Policy Term / PPT column
      // =====================================================

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

        // ---------------------------------------------------
        // Skip empty / zero / invalid rates
        // ---------------------------------------------------

        if (
          rawRate == null ||
          rawRate === "" ||
          Number.isNaN(Number(rawRate)) ||
          Number(rawRate) === 0
        ) {
          continue;
        }

        const rate = Number(rawRate);

        // ---------------------------------------------------
        // Check duplicate
        // ---------------------------------------------------

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

        // ---------------------------------------------------
        // Insert
        // ---------------------------------------------------

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

  // =========================================================
  // Final Summary
  // =========================================================

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
}

main()
  .then(async () => {
    console.log(
      "\n✅ Plan 774 premium seeding completed."
    );

    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(
      "\n❌ Plan 774 seeding failed:",
      e
    );

    await prisma.$disconnect();

    process.exit(1);
  });
*/
// 888
/*import { PrismaClient } from "@prisma/client";
import Database from "better-sqlite3";

const prisma = new PrismaClient();

async function main() {
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
}

main()
  .then(async () => {
    console.log("✅ Plan 888 premium seeding completed.");
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Seeding failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });*/

/*import { PrismaClient } from "@prisma/client";
import Database from "better-sqlite3";

const prisma = new PrismaClient();

async function main() {
const sqlite = new Database("./prisma/Creations.db", {
  readonly: true,
});

const planNumber = "889";

// ---------------------------------------------------------
// Find all Plan 889 tables
//
// Pattern:
// table_889_<policyTerm>_<PPT>_<option>
//
// Example:
// table_889_10_5_1
// table_889_15_10_2
// table_889_25_15_1
// ---------------------------------------------------------

const tables = sqlite
  .prepare(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table'
      AND name GLOB 'table_889_*'
  `)
  .all() as { name: string }[];

console.log(`Found ${tables.length} Plan ${planNumber} tables`);

// ---------------------------------------------------------
// Find ProductMaster
// ---------------------------------------------------------

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

// ---------------------------------------------------------
// Process every Plan 889 table
// ---------------------------------------------------------

for (const table of tables) {
  /*
    Table format:

    table_889_<policyTerm>_<PPT>_<option>

    Example:
    table_889_20_10_2

    group 1 = Policy Term = 20
    group 2 = PPT         = 10
    group 3 = Option      = 2
  *

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

  // -------------------------------------------------------
  // Read rows
  // -------------------------------------------------------

  const rows = sqlite
    .prepare(`SELECT * FROM "${table.name}"`)
    .all() as any[];

  if (rows.length === 0) {
    console.log(`⚠️ No rows found in ${table.name}`);
    continue;
  }

  // -------------------------------------------------------
  // T18, T19, ... T60
  //
  // These columns represent SECONDARY / SPOUSE AGE
  // -------------------------------------------------------

  const secondaryAgeColumns = Object.keys(
    rows[0] ?? {}
  ).filter((key) => /^T\d+$/.test(key));

  console.log(
    `Secondary age columns: ${secondaryAgeColumns.join(", ")}`
  );

  // -------------------------------------------------------
  // Process each primary age
  // -------------------------------------------------------

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

    // -----------------------------------------------------
    // Process each secondary/spouse age
    // -----------------------------------------------------

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

      // ---------------------------------------------------
      // Check duplicate
      // ---------------------------------------------------

      const existing =
        await prisma.productPremiumRate.findFirst({
          where: {
            productId: product.id,

            // Primary / Life Assured age
            entryAge,

            // Secondary / Spouse age
            secondaryAge,

            // Policy term
            policyTerm,

            // Plan 889 uses PPT
            premiumPayingTerm,

            // Option 1 / Option 2
            option,
          },
        });

      if (existing) {
        skipped++;
        continue;
      }

      // ---------------------------------------------------
      // Insert rate
      // ---------------------------------------------------

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
}

main()
.then(async () => {
  console.log(
    "✅ Plan 889 premium seeding completed."
  );

  await prisma.$disconnect();
})
.catch(async (e) => {
  console.error(
    "❌ Plan 889 seeding failed:",
    e
  );

  await prisma.$disconnect();
  process.exit(1);
});
*/