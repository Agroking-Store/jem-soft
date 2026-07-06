import express, { Application, Request, Response } from "express";
import cors from "cors";
import { globalErrorHandler } from "./middlewares/errorHandler.js";
import authRoutes from "./routes/authRoutes.js";
import advisorRoutes from "./routes/advisorRoutes.js";
import customerRoutes from "./routes/customerRoutes.js";
import customerMasterRoutes from "./routes/customerMasterRoutes.js";
import familyHistoryRoutes from "./routes/familyHistoryRoutes.js";
import insuranceProviderRoutes from "./routes/insuranceProviderRoutes.js";
import productCategoryRoutes from "./routes/productCategoryRoutes.js";
import productMasterRoutes from "./routes/productMasterRoutes.js";
import riderMasterRoutes from "./routes/riderMasterRoutes.js";
import policyRoutes from "./routes/policyRoutes.js";
import policyStatusMasterRoutes from "./routes/policyStatusMasterRoutes.js";
import premiumModeMasterRoutes from "./routes/premiumModeMasterRoutes.js";
import { config } from "./config/env.js";

const app: Application = express();

app.use(
  cors({
    origin: config.clientUrl || "*",
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRoutes);
app.use("/api/advisors", advisorRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/customer-master", customerMasterRoutes);
app.use("/api/family-history", familyHistoryRoutes);

app.use("/api/insurance-providers", insuranceProviderRoutes);
app.use("/api/product-categories", productCategoryRoutes);
app.use("/api/products", productMasterRoutes);
app.use("/api/riders", riderMasterRoutes);
app.use("/api/policies", policyRoutes);
app.use("/api/policy-statuses", policyStatusMasterRoutes);
app.use("/api/premium-modes", premiumModeMasterRoutes);

app.post("/test", (req, res) => {
  console.log("Headers:", req.headers);
  console.log("Body:", req.body);

  res.json(req.body);
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    status: "error",
    message: "Route not found",
  });
});

// Global Error Handler
app.use(globalErrorHandler);

export default app;
