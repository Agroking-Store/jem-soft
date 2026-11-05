import { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { catchAsync } from "../utils/catchAsync.js";
import { AppError } from "../utils/AppError.js";
import * as commissionService from "../services/commissionService.js";
import { parseCommissionCsv } from "../services/commissionParserService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const uploadCommissionBill = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    let items = req.body.items;
    let fileName: string | undefined = undefined;
    let fileUrl: string | undefined = undefined;

    if (req.file) {
      fileName = req.file.originalname;
      fileUrl = `/api/commissions/file/${req.file.filename}`;

      const isPdf =
        req.file.mimetype === "application/pdf" ||
        req.file.originalname.toLowerCase().endsWith(".pdf");

      if (!isPdf) {
        try {
          const fileContent = fs.readFileSync(req.file.path, "utf-8");
          items = parseCommissionCsv(fileContent);
        } catch {
          items = [];
        }
      }
    } else if (typeof items === "string") {
      try {
        items = JSON.parse(items);
      } catch {
        items = parseCommissionCsv(items);
      }
    }

    const billNumber = req.body.billNumber || `BILL-${Date.now().toString().slice(-6)}`;
    const billDate = req.body.billDate || new Date().toISOString();

    const result = await commissionService.saveCommissionBill({
      billNumber,
      billDate,
      agencyId: req.body.agencyId || undefined,
      advisorId: req.body.advisorId || undefined,
      agencyCode: req.body.agencyCode || undefined,
      billType: req.body.billType || "consolidated",
      totalPremium: req.body.totalPremium ? parseFloat(req.body.totalPremium) : undefined,
      grossCommission: req.body.grossCommission ? parseFloat(req.body.grossCommission) : undefined,
      fileName,
      fileUrl,
      items: Array.isArray(items) ? items : [],
    });

    res.status(201).json({
      success: true,
      message: `Commission statement ${billNumber} uploaded and archived successfully.`,
      data: result,
    });
  }
);

export const serveCommissionFile = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { fileName } = req.params;
    const safeName = path.basename(fileName);
    const filePath = path.join(__dirname, "../../uploads/commissions", safeName);

    if (!fs.existsSync(filePath)) {
      return next(new AppError("Commission statement file not found.", 404));
    }

    res.sendFile(filePath);
  }
);

export const getCommissionBills = catchAsync(
  async (req: Request, res: Response) => {
    const { agencyId } = req.query as { agencyId?: string };
    const bills = await commissionService.getAllCommissionBills(agencyId);
    res.status(200).json({ success: true, data: bills });
  }
);

export const getCommissionBillById = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const bill = await commissionService.getCommissionBillById(id);
    res.status(200).json({ success: true, data: bill });
  }
);

export const getCommissionLedger = catchAsync(
  async (req: Request, res: Response) => {
    const { fromDate, toDate, agencyId, advisorId, policyNumber, status } = req.query as any;
    const ledger = await commissionService.getCommissionLedger({
      fromDate,
      toDate,
      agencyId,
      advisorId,
      policyNumber,
      status,
    });
    res.status(200).json({ success: true, data: ledger });
  }
);

export const getCommissionForecast = catchAsync(
  async (req: Request, res: Response) => {
    const days = parseInt(req.query.days as string, 10) || 90;
    const forecast = await commissionService.getCommissionForecast(days);
    res.status(200).json({ success: true, data: forecast });
  }
);

export const getCommissionDiscrepancies = catchAsync(
  async (_req: Request, res: Response) => {
    const discrepancies = await commissionService.getCommissionDiscrepancies();
    res.status(200).json({ success: true, data: discrepancies });
  }
);

export const deleteCommissionBill = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await commissionService.deleteCommissionBill(id);
    res.status(200).json({ success: true, data: result });
  }
);


/**
 * Reconcile uploaded statement file and return preview without applying changes
 */
export const reconcileCommissionStatement = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.file) {
      return next(new AppError("Please upload a PDF commission statement file.", 400));
    }

    const isPdf =
      req.file.mimetype === "application/pdf" ||
      req.file.originalname.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      return next(new AppError("Only PDF statement files are supported for reconciliation.", 400));
    }

    const fileName = req.file.originalname;
    const fileUrl = `/api/commissions/file/${req.file.filename}`;

    const result = await commissionService.reconcileLicStatement(req.file.path, {
      agencyId: req.body.agencyId,
      advisorId: req.body.advisorId,
    });

    res.status(200).json({
      success: true,
      message: "Statement parsed and reconciled successfully.",
      data: {
        ...result,
        file: {
          fileName,
          fileUrl,
          storedFileName: req.file.filename,
        },
      },
    });
  }
);

/**
 * Apply reconciled statement payments and archive commission bill
 */
export const applyCommissionStatement = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    let rows = req.body.rows;
    if (typeof rows === "string") {
      try {
        rows = JSON.parse(rows);
      } catch {
        rows = [];
      }
    }

    const result = await commissionService.applyLicStatementPayments({
      billNumber: req.body.billNumber,
      billDate: req.body.billDate,
      agencyId: req.body.agencyId,
      advisorId: req.body.advisorId,
      agencyCode: req.body.agencyCode,
      fileName: req.body.fileName,
      fileUrl: req.body.fileUrl,
      batch: req.body.batch,
      rows: Array.isArray(rows) ? rows : [],
      skipAlreadyPaid: req.body.skipAlreadyPaid !== false,
    });

    res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  }
);
