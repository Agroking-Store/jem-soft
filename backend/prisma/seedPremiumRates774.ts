/*import { PrismaClient } from "@prisma/client";
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
      minTerm: 10,
      maxTerm: 25,
    },
    {
      tableName: "tp_774_2",
      option: 2,
      minTerm: 10,
      maxTerm: 25,
    },
    {
      tableName: "tp_774_3",
      option: 3,
      minTerm: 5,
      maxTerm: 25,
    },
    {
      tableName: "tp_774_4",
      option: 4,
      minTerm: 5,
      maxTerm: 25,
    },
  ];

  try {
    const product = await prisma.productMaster.findFirst({
      where: {
        planNumber,
      },
    });

    if (!product) {
      console.log(`❌ Plan ${planNumber} not found in ProductMaster`);
      return;
    }

    console.log(
      `Matched Product: ${product.productName} (${product.planNumber})`
    );

    let totalInserted = 0;
    let totalSkipped = 0;

    for (const {
      tableName,
      option,
      minTerm,
      maxTerm,
    } of optionTables) {
      console.log("\n=================================");
      console.log(`Processing ${tableName} → Option ${option}`);
      console.log(`Allowed Policy Terms: ${minTerm} - ${maxTerm}`);

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
        console.log(`⚠️ Table ${tableName} not found`);
        continue;
      }

      const premiumRows = sqlite
        .prepare(`SELECT * FROM "${tableName}"`)
        .all() as Record<string, unknown>[];

      console.log(`Rows found: ${premiumRows.length}`);

      if (premiumRows.length === 0) {
        console.log(`⚠️ No rows found in ${tableName}`);
        continue;
      }

      // Find columns such as T5_5, T10_5, T15_7, T25_7
      const termColumns = Object.keys(premiumRows[0] ?? {}).filter((key) =>
        /^T\d+_\d+$/.test(key)
      );

      console.log(
        `Premium columns found: ${termColumns.join(", ")}`
      );

      let inserted = 0;
      let skipped = 0;

      for (const row of premiumRows) {
        const entryAge = Number(row.Age);

        if (Number.isNaN(entryAge)) {
          console.log(`⚠️ Invalid age: ${row.Age}`);
          continue;
        }

        for (const column of termColumns) {
          const match = column.match(/^T(\d+)_(\d+)$/);

          if (!match) {
            continue;
          }

          const policyTerm = Number(match[1]);
          const premiumPayingTerm = Number(match[2]);

          // Enforce option-specific policy term range
          if (
            policyTerm < minTerm ||
            policyTerm > maxTerm
          ) {
            continue;
          }

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

      console.log(`✔ Option   : ${option}`);
      console.log(`✔ Terms    : ${minTerm} - ${maxTerm}`);
      console.log(`✔ Inserted : ${inserted}`);
      console.log(`✔ Skipped  : ${skipped}`);
    }

    console.log("\n=================================");
    console.log(`✔ Plan Number       : ${product.planNumber}`);
    console.log(`✔ Product           : ${product.productName}`);
    console.log(`✔ Options            : 1, 2, 3, 4`);
    console.log(`✔ Option 1/2 Terms   : 10 - 25`);
    console.log(`✔ Option 3/4 Terms   : 5 - 25`);
    console.log(`✔ PPT Range          : 5 - 7`);
    console.log(`✔ Inserted           : ${totalInserted}`);
    console.log(`✔ Skipped            : ${totalSkipped}`);
    console.log("=================================");
  } finally {
    sqlite.close();
  }
};
*/
import { PrismaClient } from "@prisma/client";
import Database from "better-sqlite3";

export const seedPremiumRates774 = async (prisma: PrismaClient) => {
  const sqlite = new Database("./prisma/Creations.db", {
    readonly: true,
  });

  const planNumber = "774";

  /**
   * Actual structure of the SQLite DB:
   *
   * tp_774_1
   * tp_774_2
   *   T10_5 ... T25_7
   *
   * tp_774_3
   * tp_774_4
   *   T5 ... T25
   */
  const optionTables = [
    {
      tableName: "tp_774_1",
      option: 1,
      minTerm: 10,
      maxTerm: 25,
      hasPPT: true,
    },
    {
      tableName: "tp_774_2",
      option: 2,
      minTerm: 10,
      maxTerm: 25,
      hasPPT: true,
    },
    {
      tableName: "tp_774_3",
      option: 3,
      minTerm: 5,
      maxTerm: 25,
      hasPPT: false,
    },
    {
      tableName: "tp_774_4",
      option: 4,
      minTerm: 5,
      maxTerm: 25,
      hasPPT: false,
    },
  ] as const;

  try {
    console.log("\n=================================");
    console.log(`Starting premium seeder for Plan ${planNumber}`);
    console.log("=================================\n");

    /**
     * -------------------------------------------------------
     * 1. Find product
     * -------------------------------------------------------
     */
    const product = await prisma.productMaster.findFirst({
      where: {
        planNumber,
      },
    });

    if (!product) {
      console.log(
        `❌ Plan ${planNumber} not found in ProductMaster`
      );
      return;
    }

    console.log(
      `✔ Matched Product: ${product.productName} (${product.planNumber})`
    );
    console.log(`✔ Product ID: ${product.id}`);

    let totalInserted = 0;
    let totalSkipped = 0;
    let totalInvalid = 0;

    /**
     * -------------------------------------------------------
     * 2. Process each option table
     * -------------------------------------------------------
     */
    for (const {
      tableName,
      option,
      minTerm,
      maxTerm,
      hasPPT,
    } of optionTables) {
      console.log("\n=================================");
      console.log(`Processing ${tableName}`);
      console.log(`Option       : ${option}`);
      console.log(`Term Range   : ${minTerm} - ${maxTerm}`);
      console.log(`Has PPT      : ${hasPPT}`);
      console.log("=================================");

      /**
       * -----------------------------------------------------
       * Check table existence
       * -----------------------------------------------------
       */
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
        console.log(`⚠️ Table ${tableName} not found`);
        continue;
      }

      /**
       * -----------------------------------------------------
       * Get all rows
       * -----------------------------------------------------
       */
      const premiumRows = sqlite
        .prepare(`SELECT * FROM "${tableName}"`)
        .all() as Record<string, unknown>[];

      console.log(`Rows found: ${premiumRows.length}`);

      if (premiumRows.length === 0) {
        console.log(`⚠️ No rows found in ${tableName}`);
        continue;
      }

      /**
       * -----------------------------------------------------
       * Find premium columns
       *
       * Options 1/2:
       *   T10_5
       *   T10_6
       *   T10_7
       *   ...
       *
       * Options 3/4:
       *   T5
       *   T6
       *   ...
       *   T25
       * -----------------------------------------------------
       */
      const firstRow = premiumRows[0];

      const termColumns = Object.keys(firstRow).filter((key) => {
        if (key === "Age") {
          return false;
        }

        if (hasPPT) {
          return /^T\d+_\d+$/.test(key);
        }

        return /^T\d+$/.test(key);
      });

      console.log(
        `Premium columns found: ${termColumns.length}`
      );

      console.log(termColumns.join(", "));

      if (termColumns.length === 0) {
        console.log(
          `⚠️ No valid premium columns found in ${tableName}`
        );
        continue;
      }

      let inserted = 0;
      let skipped = 0;
      let invalid = 0;

      /**
       * -----------------------------------------------------
       * Process every age
       * -----------------------------------------------------
       */
      for (const row of premiumRows) {
        const entryAge = Number(row.Age);

        if (
          row.Age == null ||
          row.Age === "" ||
          Number.isNaN(entryAge)
        ) {
          console.log(
            `⚠️ Invalid age in ${tableName}: ${row.Age}`
          );

          invalid++;
          continue;
        }

        /**
         * ---------------------------------------------------
         * Process premium columns
         * ---------------------------------------------------
         */
        for (const column of termColumns) {
          let policyTerm: number;
          let premiumPayingTerm: number | null = null;

          /**
           * -----------------------------------------------
           * OPTION 1 / 2
           *
           * Column:
           *
           * T10_5
           * T10_6
           * T10_7
           *
           * -----------------------------------------------
           */
          if (hasPPT) {
            const match = column.match(/^T(\d+)_(\d+)$/);

            if (!match) {
              continue;
            }

            policyTerm = Number(match[1]);
            premiumPayingTerm = Number(match[2]);

            /**
             * Validate PPT
             */
            if (
              premiumPayingTerm < 5 ||
              premiumPayingTerm > 7
            ) {
              continue;
            }
          } else {
            /**
             * ---------------------------------------------
             * OPTION 3 / 4
             *
             * Column:
             *
             * T5
             * T6
             * ...
             * T25
             *
             * No PPT is stored in source DB.
             * ---------------------------------------------
             */
            const match = column.match(/^T(\d+)$/);

            if (!match) {
              continue;
            }

            policyTerm = Number(match[1]);
            premiumPayingTerm = 1;
          }

          /**
           * ------------------------------------------------
           * Validate policy term
           * ------------------------------------------------
           */
          if (
            policyTerm < minTerm ||
            policyTerm > maxTerm
          ) {
            continue;
          }

          /**
           * ------------------------------------------------
           * Get rate
           * ------------------------------------------------
           */
          const rawRate = row[column];

          if (
            rawRate == null ||
            rawRate === "" ||
            Number.isNaN(Number(rawRate))
          ) {
            invalid++;
            continue;
          }

          const rate = Number(rawRate);

          /**
           * Zero means no valid premium for this
           * combination in the source database.
           */
          if (rate === 0) {
            continue;
          }

          if (!Number.isFinite(rate)) {
            invalid++;
            continue;
          }

          /**
           * ------------------------------------------------
           * Check duplicate
           * ------------------------------------------------
           *
           * Important:
           *
           * Options 3/4:
           * premiumPayingTerm = null
           *
           * Options 1/2:
           * premiumPayingTerm = 5/6/7
           */
          const existing =
            await prisma.productPremiumRate.findFirst({
              where: {
                productId: product.id,
                entryAge,
                secondaryAge: null,
                policyTerm,
                premiumPayingTerm,
                option,
              },
            });

          if (existing) {
            skipped++;
            continue;
          }

          /**
           * ------------------------------------------------
           * Insert rate
           * ------------------------------------------------
           */
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
      totalInvalid += invalid;

      /**
       * -----------------------------------------------------
       * Option summary
       * -----------------------------------------------------
       */
      console.log("\n---------------------------------");
      console.log(`Option              : ${option}`);
      console.log(`Source Table        : ${tableName}`);
      console.log(`Policy Terms        : ${minTerm} - ${maxTerm}`);

      if (hasPPT) {
        console.log(`Premium Paying Term : 5 - 7`);
      } else {
        console.log(
          `Premium Paying Term : Not applicable / NULL`
        );
      }

      console.log(`Inserted            : ${inserted}`);
      console.log(`Skipped             : ${skipped}`);
      console.log(`Invalid             : ${invalid}`);
      console.log("---------------------------------");
    }

    /**
     * -------------------------------------------------------
     * Final summary
     * -------------------------------------------------------
     */
    console.log("\n");
    console.log("==============================================");
    console.log("       PLAN 774 PREMIUM SEEDING COMPLETE");
    console.log("==============================================");

    console.log(`Plan Number       : ${product.planNumber}`);
    console.log(`Product           : ${product.productName}`);
    console.log(`Product ID        : ${product.id}`);

    console.log("\nOptions:");

    console.log(
      "Option 1          : tp_774_1 | Terms 10-25 | PPT 5-7"
    );

    console.log(
      "Option 2          : tp_774_2 | Terms 10-25 | PPT 5-7"
    );

    console.log(
      "Option 3          : tp_774_3 | Terms 5-25  | PPT NULL"
    );

    console.log(
      "Option 4          : tp_774_4 | Terms 5-25  | PPT NULL"
    );

    console.log("\nResults:");

    console.log(`Inserted          : ${totalInserted}`);
    console.log(`Skipped           : ${totalSkipped}`);
    console.log(`Invalid           : ${totalInvalid}`);

    console.log("==============================================\n");
  } catch (error) {
    console.error(
      `❌ Error while seeding Plan ${planNumber}:`,
      error
    );

    throw error;
  } finally {
    sqlite.close();

    console.log(
      `✔ SQLite database connection closed`
    );
  }
};