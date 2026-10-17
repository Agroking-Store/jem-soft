import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { protect } from "../middlewares/authMiddleware.js";
import {
  uploadCommissionBill,
  serveCommissionFile,
  getCommissionBills,
  getCommissionBillById,
  getCommissionLedger,
  getCommissionForecast,
  getCommissionDiscrepancies,
  deleteCommissionBill,
} from "../controllers/commissionController.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Upload storage for commission statements
const UPLOAD_DIR = path.join(__dirname, "../../uploads/commissions");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `comm-bill-${Date.now()}${ext}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB for large PDFs
});

const router = express.Router();

// Public route to view / stream uploaded statement file in browser tab
router.get("/file/:fileName", serveCommissionFile);

// Protected API routes
router.use(protect);

router.post("/upload", upload.single("statementFile"), uploadCommissionBill);
router.get("/bills", getCommissionBills);
router.get("/bills/:id", getCommissionBillById);
router.delete("/bills/:id", deleteCommissionBill);

// Ledger & Reporting
router.get("/ledger", getCommissionLedger);
router.get("/forecast", getCommissionForecast);
router.get("/discrepancies", getCommissionDiscrepancies);

export default router;
