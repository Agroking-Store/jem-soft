import express, { Express, Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import cors from "cors";
import { AppError } from "./utils/AppError.js";

// Import Routers
import authRoutes from "./routes/authRoutes.js";
import customerRoutes from "./routes/customerRoutes.js";
import customerMasterRoutes from "./routes/customerMasterRoutes.js";
import insuranceProviderRoutes from "./routes/insuranceProviderRoutes.js";
import productMasterRoutes from "./routes/productMasterRoutes.js";
import riderMasterRoutes from "./routes/riderMasterRoutes.js";
import advisorRoutes from "./routes/advisorRoutes.js";
import policyRoutes from "./routes/policyRoutes.js";
import policyStatusMasterRoutes from "./routes/policyStatusMasterRoutes.js";
import premiumModeMasterRoutes from "./routes/premiumModeMasterRoutes.js";
import licBranchRoutes from "./routes/licBranchRoutes.js"; // Import licBranch routes
import agencyRoutes from "./routes/agencyRoutes.js"; // Import agency routes

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/customer-master", customerMasterRoutes);
app.use("/api/insurance-providers", insuranceProviderRoutes);
app.use("/api/products", productMasterRoutes);
app.use("/api/riders", riderMasterRoutes);
app.use("/api/advisors", advisorRoutes);
app.use("/api/policies", policyRoutes);
app.use("/api/policy-statuses", policyStatusMasterRoutes);
app.use("/api/premium-modes", premiumModeMasterRoutes);
app.use("/api/lic-branches", licBranchRoutes); // Use licBranch routes
app.use("/api/agencies", agencyRoutes); // Use agency routes

// Handle unhandled routes
app.all("*", (req: Request, res: Response, next: NextFunction) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});


app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});

export default app;