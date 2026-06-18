import express, { Application, Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { globalErrorHandler } from "./middlewares/errorHandler.js";
import authRoutes from "./routes/authRoutes.js";

dotenv.config();

const app: Application = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "*",
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use("/api/auth", authRoutes);

app.use((req: Request, res: Response) => {
  res.status(404).json({
    status: "error",
    message: "Route not found",
  });
});

// Global Error Handler
app.use(globalErrorHandler);

export default app;