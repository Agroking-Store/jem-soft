
export interface ParsedCommissionItem {
  policyNo: string;
  policyHolderName?: string;
  groupCode?: string;
  agentCode?: string;
  dueDate?: string;
  dateOfPay?: string;
  premiumAmount: number;
  commissionAmount: number;
  comCode: number; // 1 = First Comm, 4 = First Year, 2 = 2nd/3rd Yr, 3 = Subsequent
  comDate?: string;
  planTermPpt?: string;
  category: "first-comm" | "first-year" | "second-third" | "subsequent";
  recoveryCause?: string;
}

/**
 * Parses raw CSV string or file content into structured commission items
 */
export function parseCommissionCsv(content: string): ParsedCommissionItem[] {
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return [];

  const items: ParsedCommissionItem[] = [];

  // Detect header row index
  let headerIndex = -1;
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const lineLower = lines[i].toLowerCase();
    if (
      lineLower.includes("policy") ||
      lineLower.includes("premium") ||
      lineLower.includes("commission")
    ) {
      headerIndex = i;
      break;
    }
  }

  // Helper to split CSV line safely handling quotes
  const splitCsvLine = (line: string): string[] => {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' || char === "'") {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values.map((v) => v.replace(/^["']|["']$/g, "").trim());
  };

  const startLine = headerIndex >= 0 ? headerIndex + 1 : 0;
  const headers =
    headerIndex >= 0
      ? splitCsvLine(lines[headerIndex]).map((h) => h.toLowerCase())
      : [];

  const getCol = (cols: string[], possibleNames: string[], defaultIdx: number): string => {
    if (headers.length > 0) {
      for (const name of possibleNames) {
        const idx = headers.findIndex((h) => h.includes(name.toLowerCase()));
        if (idx !== -1 && cols[idx] !== undefined) return cols[idx];
      }
    }
    return cols[defaultIdx] || "";
  };

  for (let i = startLine; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    if (cols.length < 3) continue;

    const policyNo = getCol(cols, ["policy", "pol_no", "policyno"], 0);
    if (!policyNo || policyNo.toLowerCase().includes("total")) continue;

    const holderName = getCol(cols, ["name", "holder", "client"], 1);
    const premiumStr = getCol(cols, ["premium", "prem", "prem_amount"], 2);
    const commStr = getCol(cols, ["commission", "comm", "comm_amount"], 3);
    const codeStr = getCol(cols, ["code", "com_code", "comcode"], 4);
    const dueDate = getCol(cols, ["due", "duedate", "due_date"], 5);
    const planPpt = getCol(cols, ["plan", "plan_term", "plantermppt"], 6);
    const agentCode = getCol(cols, ["agent", "agentcode"], 7);

    const premiumAmount = parseFloat(premiumStr.replace(/[^\d.]/g, "")) || 0;
    let commissionAmount = parseFloat(commStr.replace(/[^\d.]/g, "")) || 0;
    let comCode = parseInt(codeStr.replace(/\D/g, ""), 10) || 1;

    // Determine category based on comCode
    let category: "first-comm" | "first-year" | "second-third" | "subsequent" = "first-comm";
    if (comCode === 4) category = "first-year";
    else if (comCode === 2) category = "second-third";
    else if (comCode === 3) category = "subsequent";
    else category = "first-comm";

    // Fallback commission calculation if 0 in file
    if (commissionAmount === 0 && premiumAmount > 0) {
      if (comCode === 1 || comCode === 4) commissionAmount = Math.round(premiumAmount * 0.35 * 100) / 100;
      else if (comCode === 2) commissionAmount = Math.round(premiumAmount * 0.075 * 100) / 100;
      else commissionAmount = Math.round(premiumAmount * 0.05 * 100) / 100;
    }

    items.push({
      policyNo,
      policyHolderName: holderName || `Policyholder (${policyNo})`,
      agentCode: agentCode || "J",
      dueDate: dueDate || "12/20",
      premiumAmount,
      commissionAmount,
      comCode,
      planTermPpt: planPpt || "815/20/20",
      category,
    });
  }

  return items;
}
