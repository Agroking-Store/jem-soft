/**
 * Standalone Morning Reminder & Greeting Dispatcher
 * Can be executed directly by Windows Task Scheduler, PM2, or server cron (e.g. 09:00 AM daily)
 * Usage: node scripts/run-daily-reminders.js
 */

import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from backend root
dotenv.config({ path: join(__dirname, "..", ".env") });

async function run() {
  console.log("==================================================================");
  console.log(`⏰ [MORNING CRON] Starting Insurance Policy Reminder & Wish Engine`);
  console.log(`📅 Date: ${new Date().toLocaleString("en-IN")}`);
  console.log("==================================================================");

  try {
    const { runSchedulerScan } = await import("../dist/services/schedulerService.js");
    const result = await runSchedulerScan();
    console.log("==================================================================");
    console.log("✅ [MORNING CRON] Completed successfully!");
    console.log(`📊 Scanned Policies: ${result.totalPoliciesScanned}`);
    console.log(`🔔 Reminders Dispatched: ${result.remindersDispatched}`);
    console.log(`🎂 Birthday Wishes: ${result.birthdaysDispatched}`);
    console.log(`💐 Anniversary Wishes: ${result.anniversariesDispatched}`);
    console.log("==================================================================");
    process.exit(0);
  } catch (error) {
    console.error("❌ [MORNING CRON] Execution failed:", error);
    process.exit(1);
  }
}

run();
