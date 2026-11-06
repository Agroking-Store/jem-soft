/**
 * fortnightTracker.ts
 * -------------------
 * Flexible helper to track LIC commission statement cycles:
 * - Bi-monthly cycles (Cycle 1: 1st–15th, Cycle 2: 16th–Month End)
 * - Monthly cycles (Full month: 1st–Month End)
 * - Custom 15-day or flexible date ranges defined by the agent
 */

export type CycleMode = "fortnight_1" | "fortnight_2" | "monthly" | "custom";

export interface FortnightCycle {
  id: string; // e.g. "2026-09-F2" or "2026-09-CUSTOM"
  year: number;
  month: number; // 0-indexed (0 = Jan, 8 = Sep, 11 = Dec)
  monthName: string; // "September"
  fortnight: 1 | 2; // 1 = 1st half / F1, 2 = 2nd half / F2
  cycleType?: CycleMode;
  cycleLabel?: string; // e.g. "Cycle 1", "Cycle 2", "15-Day Batch", "Monthly"
  title: string; // "September 2026 – 2nd Fortnight (16th–30th Sep)"
  shortLabel: string; // "Sep 2026 (Cycle 2)"
  periodLabel: string; // "16 Sep – 30 Sep 2026"
  startDate: Date;
  endDate: Date;
  dueDate: Date; // Date when statement is expected
  isCompletedPeriod: boolean; // Has this period already ended in real-world time?
  isCurrentCycle: boolean; // Is today currently inside this cycle?
  isUploaded: boolean;
  uploadedBill?: {
    id: string;
    billNumber: string;
    billDate: string;
    fileUrl?: string;
    fileName?: string;
    grossCommission?: number;
    totalPremium?: number;
  };
}

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export function getLastDayOfMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Format a Date object to YYYY-MM-DD
 */
export function formatDateYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Build a single FortnightCycle object for any year, month, and fortnight
 */
export function createFortnightCycle(
  year: number,
  month: number,
  fortnight: 1 | 2,
  bills: any[] = []
): FortnightCycle {
  const lastDay = getLastDayOfMonth(year, month);
  const startDate = new Date(year, month, fortnight === 1 ? 1 : 16);
  const endDate = new Date(year, month, fortnight === 1 ? 15 : lastDay);
  const dueDate = fortnight === 1 
    ? new Date(year, month, 16) 
    : new Date(year, month + 1, 1);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDay = now.getDate();

  const isCurrentCycle = year === currentYear && month === currentMonth && (
    (fortnight === 1 && currentDay <= 15) || (fortnight === 2 && currentDay > 15)
  );
  const isCompletedPeriod = endDate < now;

  const cycleId = `${year}-${String(month + 1).padStart(2, "0")}-F${fortnight}`;
  const monthName = MONTH_NAMES[month];

  const cycle: FortnightCycle = {
    id: cycleId,
    year,
    month,
    monthName,
    fortnight,
    cycleType: fortnight === 1 ? "fortnight_1" : "fortnight_2",
    cycleLabel: `Cycle ${fortnight}`,
    title: `${monthName} ${year} – Cycle ${fortnight} (${fortnight === 1 ? "1st–15th" : `16th–${lastDay}th`})`,
    shortLabel: `${monthName.slice(0, 3)} ${year} (C${fortnight})`,
    periodLabel: `${fortnight === 1 ? "01" : "16"} ${monthName.slice(0, 3)} – ${fortnight === 1 ? "15" : lastDay} ${monthName.slice(0, 3)} ${year}`,
    startDate,
    endDate,
    dueDate,
    isCompletedPeriod,
    isCurrentCycle,
    isUploaded: false,
  };

  // Check matching in uploaded bills
  if (bills && bills.length > 0) {
    const matchedBill = bills.find((b) => {
      if (!b.billDate) return false;
      const bDate = new Date(b.billDate);
      if (isNaN(bDate.getTime())) return false;

      const bYear = bDate.getFullYear();
      const bMonth = bDate.getMonth();
      const bDay = bDate.getDate();

      // 1. Direct date matching
      if (bYear === year && bMonth === month) {
        const billFortnight = bDay <= 15 ? 1 : 2;
        if (billFortnight === fortnight) return true;
      }

      // 2. Bill number pattern matching (e.g. "LIC-2026/09/F1", "LIC-2026/09/Cycle-1", "Batch 1", etc.)
      const bNum = (b.billNumber || "").toUpperCase();
      const monthPadded = String(month + 1).padStart(2, "0");
      if (
        bNum.includes(`${year}`) &&
        (bNum.includes(`/${monthPadded}`) || bNum.includes(`-${monthPadded}`) || bNum.includes(`/${month + 1}`) || bNum.includes(monthName.toUpperCase())) &&
        (
          bNum.includes(`F${fortnight}`) ||
          bNum.includes(`B${fortnight}`) ||
          bNum.includes(`C${fortnight}`) ||
          bNum.includes(`CYCLE-${fortnight}`) ||
          bNum.includes(`CYCLE ${fortnight}`) ||
          bNum.includes(`CYCLE${fortnight}`) ||
          bNum.includes(`BATCH-${fortnight}`) ||
          bNum.includes(`BATCH ${fortnight}`) ||
          bNum.includes(`BATCH${fortnight}`)
        )
      ) {
        return true;
      }

      return false;
    });

    if (matchedBill) {
      cycle.isUploaded = true;
      cycle.uploadedBill = {
        id: matchedBill.id,
        billNumber: matchedBill.billNumber,
        billDate: matchedBill.billDate,
        fileUrl: matchedBill.fileUrl,
        fileName: matchedBill.fileName,
        grossCommission: matchedBill.grossCommission,
        totalPremium: matchedBill.totalPremium,
      };
    }
  }

  return cycle;
}

/**
 * Create a Full-Month Cycle object
 */
export function createMonthlyCycle(
  year: number,
  month: number,
  bills: any[] = []
): FortnightCycle {
  const lastDay = getLastDayOfMonth(year, month);
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month, lastDay);
  const dueDate = new Date(year, month + 1, 1);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const isCurrentCycle = year === currentYear && month === currentMonth;
  const isCompletedPeriod = endDate < now;

  const cycleId = `${year}-${String(month + 1).padStart(2, "0")}-MONTHLY`;
  const monthName = MONTH_NAMES[month];

  const cycle: FortnightCycle = {
    id: cycleId,
    year,
    month,
    monthName,
    fortnight: 1,
    cycleType: "monthly",
    cycleLabel: "Full Month",
    title: `${monthName} ${year} – Full Month Statement (1st–${lastDay}th)`,
    shortLabel: `${monthName.slice(0, 3)} ${year} (Full Month)`,
    periodLabel: `01 ${monthName.slice(0, 3)} – ${lastDay} ${monthName.slice(0, 3)} ${year}`,
    startDate,
    endDate,
    dueDate,
    isCompletedPeriod,
    isCurrentCycle,
    isUploaded: false,
  };

  if (bills && bills.length > 0) {
    const matchedBill = bills.find((b) => {
      if (!b.billDate) return false;
      const bDate = new Date(b.billDate);
      if (isNaN(bDate.getTime())) return false;

      const bYear = bDate.getFullYear();
      const bMonth = bDate.getMonth();
      const bNum = (b.billNumber || "").toUpperCase();

      if (bYear === year && bMonth === month) {
        if (bNum.includes("MONTH") || bNum.includes("FULL") || bNum.includes("MONTHLY")) {
          return true;
        }
      }
      return false;
    });

    if (matchedBill) {
      cycle.isUploaded = true;
      cycle.uploadedBill = {
        id: matchedBill.id,
        billNumber: matchedBill.billNumber,
        billDate: matchedBill.billDate,
        fileUrl: matchedBill.fileUrl,
        fileName: matchedBill.fileName,
        grossCommission: matchedBill.grossCommission,
        totalPremium: matchedBill.totalPremium,
      };
    }
  }

  return cycle;
}

/**
 * Get standard bi-monthly cycles for a specific Month & Year (both Cycle 1 and Cycle 2)
 */
export function getBiMonthlyCyclesForMonth(
  year: number,
  month: number,
  bills: any[] = []
): FortnightCycle[] {
  return [
    createFortnightCycle(year, month, 1, bills),
    createFortnightCycle(year, month, 2, bills),
  ];
}

/**
 * Generate recent bi-monthly cycles and match against uploaded bills
 */
export function getBiMonthlyCycles(
  bills: any[] = [],
  cycleCount: number = 4,
  refDate: Date = new Date()
): {
  cycles: FortnightCycle[];
  missingCycles: FortnightCycle[];
  latestPendingCycle: FortnightCycle | null;
  hasPendingStatements: boolean;
} {
  const currentYear = refDate.getFullYear();
  const currentMonth = refDate.getMonth();
  const currentDay = refDate.getDate();

  const cycles: FortnightCycle[] = [];

  let scanYear = currentYear;
  let scanMonth = currentMonth;
  let scanFortnight: 1 | 2 = currentDay <= 15 ? 1 : 2;

  for (let i = 0; i < cycleCount; i++) {
    const cycle = createFortnightCycle(scanYear, scanMonth, scanFortnight, bills);
    cycles.push(cycle);

    // Step backwards to previous fortnight
    if (scanFortnight === 2) {
      scanFortnight = 1;
    } else {
      scanFortnight = 2;
      scanMonth -= 1;
      if (scanMonth < 0) {
        scanMonth = 11;
        scanYear -= 1;
      }
    }
  }

  // Filter missing cycles that are already completed OR due
  const missingCycles = cycles.filter((c) => !c.isUploaded && (c.isCompletedPeriod || c.isCurrentCycle));
  const latestPendingCycle = missingCycles.length > 0 ? missingCycles[0] : null;

  return {
    cycles,
    missingCycles,
    latestPendingCycle,
    hasPendingStatements: missingCycles.length > 0,
  };
}
