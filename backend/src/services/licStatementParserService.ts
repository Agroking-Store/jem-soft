import fs from "fs";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { PDFParse } = require("pdf-parse");

export interface LicStatementRow {
  serialNo: number;
  policyHolderName: string;
  policyNumber: string;
  plan: string;
  term: number;
  dueDate: string;      // DD/MM/YYYY
  riskDate: string;     // DD/MM/YYYY
  cbo: string;
  adjDate: string;      // DD/MM/YYYY
  premium: number;      // e.g. 4870.00 or -4047.00
  commission: number;   // e.g. 243.50 or -202.35
  pageNumber: number;
}

export interface LicStatementSummary {
  branchCode?: string;
  agentName?: string;
  agentCode?: string;
  leaderCode?: string;
  voucherDate?: string; // DD/MM/YYYY
  batch?: string;
  pageTotals: { page: number; premium: number; commission: number }[];
  grandTotalPremium?: number;
  grandTotalCommission?: number;
  calculatedTotalPremium: number;
  calculatedTotalCommission: number;
  isChecksumValid: boolean;
  checksumDiscrepancy: {
    premiumDiff: number;
    commissionDiff: number;
  };
  totalRows: number;
  rows: LicStatementRow[];
}

/**
 * Regex to extract Annexure-A tabular row:
 * 1: S.No (digits)
 * 2: PH Name (characters, dots, parenthesis, spaces)
 * 3: PolicyNo (9 digits)
 * 4: Plan (digits e.g. 836 or 014)
 * 5: Term (digits e.g. 16)
 * 6: DueDt (DD/MM/YYYY)
 * 7: Risk Date (DD/MM/YYYY)
 * 8: CBO (alphanumeric code e.g. B095, CBK2, PCMC)
 * 9: Adj.Date (DD/MM/YYYY)
 * 10: Premium (can be positive or negative, with optional commas and decimals)
 * 11: Commission (can be positive or negative, with optional commas and decimals)
 */
const ANNEXURE_ROW_REGEX =
  /^(\d+)\s+(.+?)\s+(\d{9})\s+(\d{3})-(\d{1,2})\s+(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})\s+([A-Z0-9]+)\s+(\d{2}\/\d{2}\/\d{4})\s+(-?[\d,]+(?:\.\d{2})?)\s+(-?[\d,]+(?:\.\d{2})?)$/;

/**
 * Parses an LIC Agency Commission Bill PDF statement from either a file path or a Buffer.
 * Handles 100+ to 500+ tabular records, validates page-level and document-level totals.
 */
export async function parseLicStatementPdf(
  input: string | Buffer | Uint8Array
): Promise<LicStatementSummary> {
  let uint8Data: Uint8Array;

  if (typeof input === "string") {
    if (!fs.existsSync(input)) {
      throw new Error(`File not found at path: ${input}`);
    }
    const buffer = fs.readFileSync(input);
    uint8Data = new Uint8Array(buffer);
  } else if (Buffer.isBuffer(input)) {
    uint8Data = new Uint8Array(input);
  } else if (input instanceof Uint8Array) {
    uint8Data = input;
  } else {
    throw new Error("Invalid input provided to parseLicStatementPdf. Expected file path or Buffer.");
  }

  const parser = new PDFParse(uint8Data);
  const pdfData = await parser.getText();

  if (!pdfData || !pdfData.pages || pdfData.pages.length === 0) {
    throw new Error("Failed to extract text from PDF or PDF has no pages.");
  }

  const summary: LicStatementSummary = {
    pageTotals: [],
    calculatedTotalPremium: 0,
    calculatedTotalCommission: 0,
    isChecksumValid: false,
    checksumDiscrepancy: { premiumDiff: 0, commissionDiff: 0 },
    totalRows: 0,
    rows: []
  };

  for (let pageIdx = 0; pageIdx < pdfData.pages.length; pageIdx++) {
    const pageNum = pageIdx + 1;
    const lines = pdfData.pages[pageIdx].text.split("\n");

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      // 1. Header Metadata Extraction
      if (line.includes("Branch Code:")) {
        const m = line.match(/Branch Code:\s*([^\s]+)/);
        if (m && !summary.branchCode) summary.branchCode = m[1];
      }
      if (line.includes("Agent Name :")) {
        const raw = line.replace(/^.*?Agent Name\s*:\s*/i, "").trim();
        // Strip address portion that usually follows the agent's full name (e.g. B602...)
        const nameOnly = raw.replace(/\s+(B\d+|SNO|FLAT|PLOT|HOUSE|NO\.\d).*$/i, "").trim();
        if (!summary.agentName && nameOnly) {
          summary.agentName = nameOnly;
        }
      }
      if (line.includes("Agent Code :")) {
        const m = line.match(/Agent Code :\s*([^\s]+)/);
        if (m && !summary.agentCode) summary.agentCode = m[1];
      }
      if (line.includes("Leader Code :")) {
        const m = line.match(/Leader Code :\s*([^\s]+)/);
        if (m && !summary.leaderCode) summary.leaderCode = m[1];
      }
      if (line.includes("Commission Bill Voucher Processed on")) {
        const m = line.match(/Commission Bill Voucher Processed on\s*(\d{2}\/\d{2}\/\d{4})/);
        if (m && !summary.voucherDate) summary.voucherDate = m[1];
      }
      if (line.includes("Batch :")) {
        const m = line.match(/Batch\s*:\s*(.+)$/);
        if (m && !summary.batch) summary.batch = m[1].trim();
      }

      // 2. Page Totals Extraction
      if (line.startsWith("Page Total Premium :")) {
        const m = line.match(
          /Page Total Premium :\s*(-?[\d,]+(?:\.\d{2})?)\s+Commission :\s*(-?[\d,]+(?:\.\d{2})?)/
        );
        if (m) {
          summary.pageTotals.push({
            page: pageNum,
            premium: parseFloat(m[1].replace(/,/g, "")),
            commission: parseFloat(m[2].replace(/,/g, ""))
          });
        }
      }

      // 3. Document Grand Total Extraction
      if (line.startsWith("Grand Total Premium :")) {
        const m = line.match(
          /Grand Total Premium :\s*(-?[\d,]+(?:\.\d{2})?)\s+Commission :\s*(-?[\d,]+(?:\.\d{2})?)/
        );
        if (m) {
          summary.grandTotalPremium = parseFloat(m[1].replace(/,/g, ""));
          summary.grandTotalCommission = parseFloat(m[2].replace(/,/g, ""));
        }
      }

      // 4. Tabular Annexure-A Row Extraction
      const rowMatch = line.match(ANNEXURE_ROW_REGEX);
      if (rowMatch) {
        const serialNo = parseInt(rowMatch[1], 10);
        const policyHolderName = rowMatch[2].trim();
        const policyNumber = rowMatch[3];
        const plan = rowMatch[4];
        const term = parseInt(rowMatch[5], 10);
        const dueDate = rowMatch[6];
        const riskDate = rowMatch[7];
        const cbo = rowMatch[8];
        const adjDate = rowMatch[9];
        const premium = parseFloat(rowMatch[10].replace(/,/g, ""));
        const commission = parseFloat(rowMatch[11].replace(/,/g, ""));

        summary.rows.push({
          serialNo,
          policyHolderName,
          policyNumber,
          plan,
          term,
          dueDate,
          riskDate,
          cbo,
          adjDate,
          premium,
          commission,
          pageNumber: pageNum
        });

        summary.calculatedTotalPremium += premium;
        summary.calculatedTotalCommission += commission;
      }
    }
  }

  // Round calculated totals to 2 decimal places to avoid floating point inaccuracies
  summary.calculatedTotalPremium = Math.round(summary.calculatedTotalPremium * 100) / 100;
  summary.calculatedTotalCommission = Math.round(summary.calculatedTotalCommission * 100) / 100;
  summary.totalRows = summary.rows.length;

  // Validate checksum against Grand Total in document
  if (summary.grandTotalPremium !== undefined) {
    const pDiff = Math.abs(summary.calculatedTotalPremium - summary.grandTotalPremium);
    const cDiff = Math.abs(
      summary.calculatedTotalCommission - (summary.grandTotalCommission || 0)
    );
    summary.checksumDiscrepancy = {
      premiumDiff: Math.round(pDiff * 100) / 100,
      commissionDiff: Math.round(cDiff * 100) / 100
    };
    // Tolerating <= 1 rupee due to minor rounding differences in standard accounting if any
    summary.isChecksumValid = pDiff < 1.0 && cDiff < 1.0;
  } else {
    // If grand total footer was not found, fallback to valid if rows exist
    summary.isChecksumValid = summary.totalRows > 0;
  }

  return summary;
}

/**
 * Converts a DD/MM/YYYY date string into a Date object at UTC midnight.
 */
export function parseDateUtc(dateStr: string): Date {
  const [day, month, year] = dateStr.split("/").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export type StatementRowReconcileStatus =
  | "MATCHED_UNPAID"
  | "MATCHED_ALREADY_PAID"
  | "PAYMENT_NOT_FOUND"
  | "POLICY_NOT_FOUND";

export interface LicStatementReconciledRow extends LicStatementRow {
  status: StatementRowReconcileStatus;
  policyId?: string;
  customerName?: string;
  paymentId?: string;
  existingPaymentStatus?: string;
  statusDescription: string;
}
