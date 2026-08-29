import app from "./app.js";
import dotenv from "dotenv";
import { initScheduler } from "./services/schedulerService.js";
import { seedDefaultTemplates } from "./services/templateService.js";

dotenv.config();

const port = process.env.PORT || 5000;

app.listen(port, async () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
  try {
    await seedDefaultTemplates();
    initScheduler();
  } catch (err: any) {
    console.error("[server]: Startup task error:", err.message);
  }
});