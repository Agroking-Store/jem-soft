import app from "./app.js";
import { connectDB } from "./config/database.js";
import { config } from "./config/env.js";


// Start server
const startServer = async (): Promise<void> => {
  await connectDB();

  const server = app.listen(config.port, () => {
    console.log(`🚀 Server running on port ${config.port}`);
  });

  process.on("SIGTERM", () => {
    server.close(() => process.exit(0));
  });
};

// Start the application
startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});