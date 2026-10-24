
"use client";

import { Fragment, useMemo, useRef, useState } from "react";
import { ArrowLeft, Download } from "lucide-react";
import { LoanInterestOutstandingFormData } from "./LoanInterestOutstandingForm";
import {
  fmtDate,
  money,
  round2,
  getMemberName,
  getMemberAddress,
  getMemberMobile,
  getMemberDob,
  isAgencyMatch,
  pickFilterNames,
  pickGroupKeys,
  matchesAny,
} from "./loanReportHelpers";
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";
import toast from "react-hot-toast";

interface Props {
  formData: LoanInterestOutstandingFormData;
  policies?: any[];
  customers?: any[];
  loans?: any[];
  onBackToForm: () => void;
}

type ReportRow = {
  id: string;
  policyNo: string;
  member: string;
  address: string;
  mobile: string;
  dob: string;
  groupCode: string;
  groupName: string;
  agentCode: string;
  branchCode: string;
  planTermPpt: string;
  loanDate: Date;
  loanAmount: number;
  interestRate: number;
  fuliDate: Date | null;
  interestFrom: Date;
  interestTo: Date;
  interestAmount: number;
  periodMonths: number;
  instalmentPremium: number;
};

const validDate = (value: unknown): Date | null => {
  if (!value) return null;
  const d = new Date(value as string);
  return Number.isNaN(d.getTime()) ? null : d;
};

const endOfDay = (date: Date) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

const monthDifference = (from: Date, to: Date) => {
  let months =
    (to.getFullYear() - from.getFullYear()) * 12 +
    to.getMonth() -
    from.getMonth();

  if (to.getDate() < from.getDate()) months -= 1;
  return Math.max(0, months);
};

const BLACK = "#000";
const thStyle = {
  borderTop: `1px solid ${BLACK}`,
  borderBottom: `1px solid ${BLACK}`,
  verticalAlign: "bottom" as const,
};

export default function LoanInterestOutstandingReportView({
  formData,
  loans = [],
  onBackToForm,
}: Props) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const calculationDate = useMemo(
    () =>
      endOfDay(
        validDate(formData.calculationDate) || new Date()
      ),
    [formData.calculationDate]
  );

  const report = useMemo(() => {
    const selectedAgencies = pickFilterNames(
      formData.appliedFilters,
      "Agencies"
    );
    const selectedStatuses = pickFilterNames(
      formData.appliedFilters,
      "Policy Status"
    );
    const selectedBranches = pickFilterNames(
      formData.appliedFilters,
      "Branches"
    );
    const selectedAreas = pickFilterNames(
      formData.appliedFilters,
      "Areas"
    );
    const selectedGroups = pickGroupKeys(formData.appliedFilters);

    const selectedGroupCodes = (formData.selectedGroups || [])
      .map((g) => (g.groupCode || "").toLowerCase().trim())
      .filter(Boolean);

    const selectedItems =
      formData.sortingFilterSelection?.selectedItems || [];

    const selectedMemberIds = new Set(
      formData.sortingOption === "groupMemberwise"
        ? selectedItems.map((item) => item.id)
        : []
    );

    const sortingPairs = selectedItems.map((item: any) => ({
      code: String(item.code || "").toLowerCase().trim(),
      name: String(item.name || "").toLowerCase().trim(),
    }));

    const matchesSorting = (code = "", name = "") => {
      if (!sortingPairs.length) return true;

      const c = code.toLowerCase().trim();
      const n = name.toLowerCase().trim();

      return sortingPairs.some(
        (p) =>
          (p.code && (c.includes(p.code) || p.code.includes(c))) ||
          (p.name && (n.includes(p.name) || p.name.includes(n))) ||
          (p.code && n.includes(p.code)) ||
          (p.name && c.includes(p.name))
      );
    };

    const rows: ReportRow[] = [];

    // Do not manufacture records from policies when actual loan records
    // are unavailable. Missing loan data should be investigated upstream.
    for (const loan of loans) {
      const policy = loan.policy || {};
      const loanDate = validDate(loan.loanDate);

      if (!loanDate || loanDate > calculationDate) continue;

      const originalAmount = Number(loan.loanAmount);
      const rate = Number(loan.interestRate);

      if (
        !Number.isFinite(originalAmount) ||
        originalAmount <= 0 ||
        !Number.isFinite(rate) ||
        rate < 0
      ) {
        continue;
      }

      const repayments = (Array.isArray(loan.repayments)
        ? loan.repayments
        : [])
        .map((repayment: any) => ({
          ...repayment,
          parsedDate: validDate(repayment.repaymentDate),
        }))
        .filter(
          (repayment: any) =>
            repayment.parsedDate &&
            repayment.parsedDate <= calculationDate
        )
        .sort(
          (a: any, b: any) =>
            a.parsedDate.getTime() - b.parsedDate.getTime()
        );

      const principalPaid = repayments.reduce(
        (sum: number, repayment: any) =>
          sum + Math.max(0, Number(repayment.principalComponent) || 0),
        0
      );

      const outstandingPrincipal = round2(
        Math.max(0, originalAmount - principalPaid)
      );

      if (outstandingPrincipal <= 0) continue;

      const lastRepayment = repayments.at(-1);
      const customer = policy.customer || {};
      const customerMaster = policy.CustomerMaster || {};
      const groupCode = String(customer.groupCode || "");
      const groupName = String(
        customer.groupName || customer.name || "Ungrouped"
      );

      const memberId = String(
        customerMaster.id ||
          policy.CustomerMasterId ||
          ""
      );

      const memberName = getMemberName({
        policy,
        customer,
        CustomerMaster: customerMaster,
      });

      const advisorCode = String(
        policy.advisor?.advisorCode || policy.agentCode || ""
      );
      const advisorName = String(
        policy.advisor?.advisorName || ""
      );
      const agencyName = String(
        policy.advisor?.agency?.agencyName ||
          policy.agency?.agencyName ||
          ""
      );
      const agencyCode = String(
        policy.advisor?.agency?.agencyCode ||
          policy.agency?.agencyCode ||
          ""
      );
      const branchCode = String(
        policy.branch?.branchCode || policy.branchNo || ""
      );
      const branchName = String(policy.branch?.branchName || "");
      const statusName = String(
        policy.status?.statusName ||
          loan.loanStatus?.statusName ||
          ""
      );
      const area = String(customer.resArea || "");
      const city = String(customer.resCity || "");

      if (!isAgencyMatch(
        {
          agentCode: String(policy.agentCode || ""),
          advisorName,
          advisorCode,
          agencyName,
          agencyCode,
        },
        selectedAgencies
      )) continue;

      if (!matchesAny(statusName, selectedStatuses)) continue;

      if (
        selectedBranches.length &&
        !matchesAny(`${branchCode} ${branchName}`, selectedBranches)
      ) continue;

      if (
        selectedAreas.length &&
        !matchesAny(`${area} ${city}`, selectedAreas)
      ) continue;

      if (
        selectedGroupCodes.length &&
        !selectedGroupCodes.some(
          (code) => code === groupCode.toLowerCase()
        )
      ) continue;

      if (
        selectedGroups.length &&
        !selectedGroups.some(
          (code) =>
            groupCode.toLowerCase() === code ||
            groupName.toLowerCase().includes(code)
        )
      ) continue;

      if (
        formData.sortingOption === "groupMemberwise" &&
        selectedMemberIds.size &&
        !selectedMemberIds.has(memberId)
      ) continue;

      if (formData.sortingOption === "areaWise" &&
          !matchesSorting("", area)) continue;

      if (formData.sortingOption === "subAreaWise" &&
          !matchesSorting("", city)) continue;

      if (
        formData.sortingOption === "branchNoWise" &&
        !matchesSorting(branchCode, branchName)
      ) continue;

      /*
       * IMPORTANT:
       * Confirm the actual FULI field and interest rules with the
       * backend/business owner before production use.
       */
      const fuliDate = validDate(
        policy.fuliDate ||
        policy.FULIDate ||
        loan.fuliDate
      );

      const interestFrom =
        fuliDate && fuliDate <= calculationDate
          ? fuliDate
          : lastRepayment?.parsedDate || loanDate;

      const elapsedDays = Math.max(
        0,
        Math.floor(
          (calculationDate.getTime() - interestFrom.getTime()) /
            86400000
        )
      );

      // Provisional simple-interest estimate; not a substitute for
      // the verified JEM Soft compounding/business calculation.
      const interestAmount = round2(
        (outstandingPrincipal * rate * elapsedDays) / 36500
      );

      rows.push({
        id: String(loan.id),
        policyNo: String(policy.policyNumber || "N/A"),
        member: memberName,
        address: getMemberAddress({
          policy,
          customer,
          CustomerMaster: customerMaster,
        }),
        mobile: getMemberMobile({
          policy,
          customer,
          CustomerMaster: customerMaster,
        }),
        dob: getMemberDob({
          policy,
          customer,
          CustomerMaster: customerMaster,
        }),
        groupCode,
        groupName,
        agentCode: advisorCode,
        branchCode,
        planTermPpt: [
          policy.product?.planNumber || "",
          policy.policyTerm ?? "",
          policy.premiumPayingTerm ?? "",
        ].join("/"),
        loanDate,
        loanAmount: originalAmount,
        interestRate: rate,
        fuliDate,
        interestFrom,
        interestTo: calculationDate,
        interestAmount,
        periodMonths: monthDifference(interestFrom, calculationDate),
        instalmentPremium: Number(
          policy.instalmentPremium ??
          policy.premiumAmount ??
          policy.premium ??
          0
        ) || 0,
      });
    }

    const groups = new Map<string, ReportRow[]>();

    for (const row of rows) {
      let key = row.groupCode || row.groupName || "Ungrouped";

      if (formData.sortingOption === "groupMemberwise") {
        key = row.member;
      } else if (formData.sortingOption === "areaWise") {
        key = String(row.address || "Unknown area");
      } else if (formData.sortingOption === "branchNoWise") {
        key = row.branchCode || "Unknown branch";
      }

      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(row);
    }

    return {
      rows,
      groups: Array.from(groups.entries()).map(([key, items]) => ({
        key,
        heading:
          formData.sortingOption === "groupMemberwise"
            ? key
            : `${items[0]?.groupCode || ""} ${items[0]?.groupName || key}`.trim(),
        items,
        totalLoan: round2(
          items.reduce((sum, row) => sum + row.loanAmount, 0)
        ),
        totalInterest: round2(
          items.reduce((sum, row) => sum + row.interestAmount, 0)
        ),
      })),
      totalLoan: round2(
        rows.reduce((sum, row) => sum + row.loanAmount, 0)
      ),
      totalInterest: round2(
        rows.reduce((sum, row) => sum + row.interestAmount, 0)
      ),
    };
  }, [loans, formData, calculationDate]);

  const downloadPDF = async () => {
    if (!reportRef.current) return;

    setIsExporting(true);
    const toastId = toast.loading("Generating PDF...");

    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      const pageWidth = 297;
      const pageHeight = 210;
      const pxPerMm = canvas.width / pageWidth;
      const sliceHeight = Math.floor(pageHeight * pxPerMm);

      let offset = 0;
      let page = 0;

      while (offset < canvas.height) {
        const height = Math.min(
          sliceHeight,
          canvas.height - offset
        );
        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        pageCanvas.height = height;

        const context = pageCanvas.getContext("2d");
        if (!context) throw new Error("Unable to create PDF canvas");

        context.fillStyle = "#fff";
        context.fillRect(0, 0, canvas.width, height);
        context.drawImage(
          canvas,
          0, offset, canvas.width, height,
          0, 0, canvas.width, height
        );

        if (page > 0) pdf.addPage();

        pdf.addImage(
          pageCanvas.toDataURL("image/jpeg", 0.9),
          "JPEG",
          0,
          0,
          pageWidth,
          height / pxPerMm
        );

        offset += height;
        page += 1;
      }

      pdf.save(
        `Loan_Interest_Outstanding_${formData.reportDate || "Report"}.pdf`
      );
      toast.success("PDF downloaded.", { id: toastId });
    } catch (error: any) {
      console.error("Loan interest outstanding PDF export failed:", error);
      toast.error(error?.message || "PDF export failed.", { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <button
          onClick={onBackToForm}
          className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm"
        >
          <ArrowLeft size={16} />
          Edit Filters
        </button>

        <button
          onClick={downloadPDF}
          disabled={isExporting}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          <Download size={16} />
          {isExporting ? "Exporting..." : "Download PDF"}
        </button>
      </div>

      <div
        ref={reportRef}
        className="mx-auto max-w-full bg-white p-5 text-black"
        style={{ fontFamily: "Arial, Helvetica, sans-serif", fontSize: 10 }}
      >
        <div className="mb-1 flex justify-between font-bold">
          <span>
            Loan Interest Outstanding{" "}
            {formData.reportType === "Intimation"
              ? "Intimation"
              : "Statement"}
          </span>
          <span>
            Policies: {report.rows.length}
          </span>
        </div>

        <div className="mb-3 flex justify-between">
          <span>
            As on {fmtDate(formData.reportDate) || fmtDate(new Date())}
          </span>
          <span>
            Interest calculated up to {fmtDate(calculationDate)}
          </span>
        </div>

        {report.rows.length === 0 ? (
          <div className="border border-dashed p-8 text-center">
            No real loan records matched the selected filters. Check the
            loan data source and filter selections.
          </div>
        ) : (
          <table className="w-full border-collapse text-left">
            <thead>
              <tr>
                {[
                  "Policy No",
                  "Ag Cd",
                  "Pl/Tm/Pt",
                  "Brn",
                  "Loan Date",
                  "Loan Amount",
                  "Rate %",
                  "FULI Date",
                  "Interest From",
                  "Interest To",
                  "Interest Amount",
                  "Period (Months)",
                  "Instalment Premium",
                ].map((heading) => (
                  <th
                    key={heading}
                    className="px-1 py-2"
                    style={thStyle}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            {report.groups.map((group) => (
              <tbody key={group.key}>
                <tr>
                  <td colSpan={13} className="pb-1 pt-3 text-center font-bold">
                    {group.heading}
                  </td>
                </tr>

                {group.items.map((row) => (
                  <Fragment key={row.id}>
                    <tr>
                      <td colSpan={13} className="pb-1 pt-2 font-semibold">
                        {row.member}
                        {formData.statementOptions.statementWithAddress &&
                          row.address && ` — ${row.address}`}
                        {formData.statementOptions.registerWithTelNos &&
                          row.mobile && ` — Tel: ${row.mobile}`}
                        {(formData.statementOptions.dob ||
                          (formData.reportType === "Intimation" &&
                            formData.intimationOptions.dob)) &&
                          row.dob && ` — DOB: ${fmtDate(row.dob)}`}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-1 py-1">{row.policyNo}</td>
                      <td className="px-1 py-1">{row.agentCode || "—"}</td>
                      <td className="px-1 py-1">{row.planTermPpt}</td>
                      <td className="px-1 py-1">{row.branchCode || "—"}</td>
                      <td className="px-1 py-1 whitespace-nowrap">
                        {fmtDate(row.loanDate)}
                      </td>
                      <td className="px-1 py-1 text-right">
                        {money(row.loanAmount)}
                      </td>
                      <td className="px-1 py-1 text-right">
                        {row.interestRate}%
                      </td>
                      <td className="px-1 py-1 whitespace-nowrap">
                        {fmtDate(row.fuliDate)}
                      </td>
                      <td className="px-1 py-1 whitespace-nowrap">
                        {fmtDate(row.interestFrom)}
                      </td>
                      <td className="px-1 py-1 whitespace-nowrap">
                        {fmtDate(row.interestTo)}
                      </td>
                      <td className="px-1 py-1 text-right">
                        {money(row.interestAmount)}
                      </td>
                      <td className="px-1 py-1 text-right">
                        {row.periodMonths}
                      </td>
                      <td className="px-1 py-1 text-right">
                        {money(row.instalmentPremium)}
                      </td>
                    </tr>
                  </Fragment>
                ))}

                <tr className="font-bold">
                  <td colSpan={5} className="px-1 py-2 text-right">
                    Group Total:
                  </td>
                  <td className="px-1 py-2 text-right">
                    {money(group.totalLoan)}
                  </td>
                  <td colSpan={4} />
                  <td className="px-1 py-2 text-right">
                    {money(group.totalInterest)}
                  </td>
                  <td colSpan={2} />
                </tr>
                <tr>
                  <td colSpan={13} style={{ borderBottom: "1px solid #000" }} />
                </tr>
              </tbody>
            ))}
          </table>
        )}

        <div className="mt-4 flex justify-end">
          <table>
            <tbody>
              <tr>
                <td className="px-2 py-1 font-bold">
                  Total Loan Amount:
                </td>
                <td className="px-2 py-1 text-right">
                  ₹ {money(report.totalLoan)}
                </td>
              </tr>
              <tr>
                <td className="px-2 py-1 font-bold">
                  Total Interest:
                </td>
                <td className="px-2 py-1 text-right">
                  ₹ {money(report.totalInterest)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="mt-4 border-t pt-2 text-[9px]">
          Calculation note: the displayed interest is a provisional simple
          interest estimate. Confirm the official FULI date field, interest
          accrual rules, compounding treatment, and interest already paid
          before using this report for financial decisions.
        </p>
      </div>
    </div>
  );
}
