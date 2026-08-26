import express, { Application, Request, Response } from "express";
import cors from "cors";
import { globalErrorHandler } from "./middlewares/errorHandler.js";
import authRoutes from "./routes/authRoutes.js";
import customerRoutes from "./routes/customerRoutes.js";
import customerMasterRoutes from "./routes/customerMasterRoutes.js";
import familyHistoryRoutes from "./routes/familyHistoryRoutes.js";
import medicalHistoryRoutes from "./routes/medicalHistoryRoutes.js";
import insuranceProviderRoutes from "./routes/insuranceProviderRoutes.js";
import productCategoryRoutes from "./routes/productCategoryRoutes.js";
import productMasterRoutes from "./routes/productMasterRoutes.js";
import riderMasterRoutes from "./routes/riderMasterRoutes.js";
import advisorRoutes from "./routes/advisorRoutes.js";
import policyRoutes from "./routes/policyRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import policyStatusMasterRoutes from "./routes/policyStatusMasterRoutes.js";
import premiumModeMasterRoutes from "./routes/premiumModeMasterRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import claimRoutes from "./routes/claimRoutes.js";
import loanRoutes from "./routes/loanRoutes.js";
import loanStatusMasterRoutes from "./routes/loanStatusMasterRoutes.js";
import licBranchRoutes from "./routes/licBranchRoutes.js";
import agencyRoutes from "./routes/agencyRoutes.js";
import productAttributeMasterRoutes from "./routes/productAttributeMasterRoutes.js";
import productAttributeValueRoutes from "./routes/productAttributeValueRoutes.js";
import { config } from "./config/env.js";

const app: Application = express();

const allowedOrigins = [
  config.clientUrl,
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3001",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use("/api/auth", authRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/customer-master", customerMasterRoutes);
app.use("/api/family-history", familyHistoryRoutes);
app.use("/api/medical-history", medicalHistoryRoutes);
app.use("/api/claims", claimRoutes);
app.use("/api/loans", loanRoutes);
app.use("/api/loan-statuses", loanStatusMasterRoutes);
app.use("/api/insurance-providers", insuranceProviderRoutes);
app.use("/api/product-categories", productCategoryRoutes);
app.use("/api/products", productMasterRoutes);
app.use("/api/riders", riderMasterRoutes);
app.use("/api/advisors", advisorRoutes);
app.use("/api/policies", policyRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/policy-statuses", policyStatusMasterRoutes);
app.use("/api/premium-modes", premiumModeMasterRoutes);
app.use("/api/users", userRoutes);
app.use("/api/lic-branches", licBranchRoutes);
app.use("/api/agencies", agencyRoutes);
app.use("/api/product-attributes-master", productAttributeMasterRoutes);
app.use("/api/product-attribute-values", productAttributeValueRoutes);

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