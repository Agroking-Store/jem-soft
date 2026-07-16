import { defineConfig } from "@prisma/config";
import * as dotenv from "dotenv";

dotenv.config();

export default defineConfig({
  seed: {
    run: "tsx prisma/seed.ts",
  },
} as any);
