import express from "express";
import cors from "cors";
import { globalErrorHandler } from "./middlewares/errorHandler.js";
import authRoutes from "./routes/authRoutes.js";

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  }),
);
app.use(express.json());

app.use("/api/auth", authRoutes);

app.use(globalErrorHandler);

export default app;
