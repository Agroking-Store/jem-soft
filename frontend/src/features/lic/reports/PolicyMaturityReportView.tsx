"use client";

import { useRef, useState, useMemo, Fragment, ReactNode } from "react";
import { ArrowLeft, Download } from "lucide-react";
import { PolicyMaturityFormData } from "./PolicyMaturityForm";
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";
import toast from "react-hot-toast";

interface PolicyMaturityReportViewProps {
  formData: PolicyMaturityFormData;
  policies: any[];
  customers: any[];
  onBackToForm: () => void;
}

// Bonus-estimation placeholders — tune these to your real declared bonus rates.
const VESTED_BONUS_RATE_PER_1000_PA = 45; // ₹ per ₹1000 SA per completed year
const FAB_RATE_PER_1000 = 15; // ₹ per ₹1000 SA, flat, applied once at maturity

function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB");
}

interface ColumnDef {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  render: (p: any) => ReactNode;
}

export default function PolicyMaturityReportView({
  formData,
  policies: rawPolicies = [],
  onBackToForm,
}: PolicyMaturityReportViewProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const columns: ColumnDef[] = useMemo(() => {
    const cols: ColumnDef[] = [
      { key: "policyNo", label: "Policy No", align: "left", render: (p) => <span className="font-mono">{p.policyNo}</span> },
      { key: "agCd", label: "Ag Cd", align: "center", render: (p) => p.agCd },
      { key: "comDate", label: "Comm. Date", render: (p) => p.comDate },
      { key: "planTermPpt", label: "Pl/Tm/Pt", render: (p) => p.planTermPpt },
      { key: "md", label: "Md", align: "center", render: (p) => p.md },
      { key: "brn", label: "Brn", render: (p) => p.brn },
      { key: "maturityDate", label: "Maturity Date", render: (p) => p.maturityDate },
    ];
    if (formData.reportOptions.dob) {
      cols.push({ key: "dob", label: "D.O.B", align: "center", render: (p) => p.dob || "—" });
    }
    if (formData.reportOptions.statementWithPan) {
      cols.push({ key: "pan", label: "PAN No.", align: "center", render: (p) => p.pan || "—" });
    }
    cols.push(
      { key: "sumAssured", label: "Sum Assured", align: "right", render: (p) => p.sumAssured.toLocaleString("en-IN") },
      { key: "vestedBonus", label: "Vested Bonus", align: "right", render: (p) => p.vestedBonus.toLocaleString("en-IN") },
      { key: "fab", label: "F.A.B", align: "right", render: (p) => p.fab.toLocaleString("en-IN") },
      { key: "loanOutstanding", label: "Loan O/s", align: "right", render: (p) => p.loanOutstanding.toLocaleString("en-IN") },
      {
        key: "netMaturityPayable",
        label: "Net Maturity Payable",
        align: "right",
        render: (p) => <span className="font-bold">{p.netMaturityPayable.toLocaleString("en-IN")}</span>,
      }
    );
    return cols;
  }, [formData.reportOptions.dob, formData.reportOptions.statementWithPan]);

  const alignClass = (a?: "left" | "right" | "center") =>
    a === "right" ? "text-right" : a === "center" ? "text-center" : "text-left";

  const groupData = useMemo(() => {
    const fromDate = formData.fromMaturityDate ? new Date(formData.fromMaturityDate) : null;
    const toDate = formData.toMaturityDate ? new Date(formData.toMaturityDate) : null;

    if (fromDate) fromDate.setHours(0, 0, 0, 0);
    if (toDate) toDate.setHours(23, 59, 59, 999);

    const selectedGroupCodesOrNames =
      formData.sortingOption === "groupsWise"
        ? (formData.selectedGroups || []).map((g) => g.groupCode.toLowerCase())
        : (formData.sortingFilterSelection?.selectedItems || []).map((item) => (item.code || item.name).toLowerCase());

    const getPolicyMaturityDate = (p: any): Date | null => {
      if (p.maturityDate) {
        const d = new Date(p.maturityDate);
        if (!isNaN(d.getTime())) return d;
      }
      if (p.commencementDate && p.policyTerm) {
        const cd = new Date(p.commencementDate);
        if (!isNaN(cd.getTime())) {
          const md = new Date(cd);
          md.setFullYear(md.getFullYear() + Number(p.policyTerm));
          return md;
        }
      }
      return null;
    };

    const validDbPolicies = rawPolicies.filter((p) => {
      const isAnnuity = Boolean(p.product?.isAnnuity || p.isAnnuity);
      if (isAnnuity && !formData.includeAnnuityPolicies) return false;

      const isRecordOnly = Boolean(p.isRecordOnly);
      if (isRecordOnly && !formData.includeRecordOnlyPolicies) return false;

      const md = getPolicyMaturityDate(p);
      if (!md) return false;

      if (fromDate && md < fromDate) return false;
      if (toDate && md > toDate) return false;

      return true;
    });

    const buildRow = (p: any, computedMaturityDate: Date) => {
      const custMaster = p.CustomerMaster;
      const custObj = p.customer;
      const mode = p.premiumMode?.modeName?.[0]?.toUpperCase() || "Y";
      const sumAssured = Number(p.premium?.sumAssured || p.sumAssured || 0);
      const comDate = p.commencementDate ? new Date(p.commencementDate) : new Date();
      const completedYears = Math.max(
        1,
        Math.floor((computedMaturityDate.getTime() - comDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      );
      const vestedBonus = Math.round((sumAssured / 1000) * VESTED_BONUS_RATE_PER_1000_PA * completedYears);
      const fab = Math.round((sumAssured / 1000) * FAB_RATE_PER_1000);
      const loanOutstanding = Number(p.loanOutstanding || 0);
      const netMaturityPayable = sumAssured + vestedBonus + fab - loanOutstanding;

      const memberPan = custMaster?.panNumber || custObj?.pan || "";
      const memberDob = fmtDate(custMaster?.dob || custObj?.dob);

      return {
        policyNo: p.policyNumber || "—",
        agCd: p.agentCode || "—",
        comDate: fmtDate(comDate) || "—",
        planTermPpt: `${p.product?.planNumber || "—"}/${p.policyTerm || "—"}/${p.premiumPayingTerm || "—"}`,
        md: mode,
        brn: p.branch?.branchCode || p.branchNo || "—",
        maturityDate: fmtDate(computedMaturityDate),
        dob: memberDob,
        pan: memberPan,
        sumAssured,
        vestedBonus,
        fab,
        loanOutstanding,
        netMaturityPayable,
      };
    };

    if (validDbPolicies.length === 0) {
      return [];
    }

    const groupMap: { [key: string]: any } = {};
    validDbPolicies.forEach((p) => {
      const custMaster = p.CustomerMaster;
      const custObj = p.customer;
      const gCode = custObj?.groupCode || `M${(p.clientId || "01").toString().padStart(3, "0")}`;
      const gHeadName = custObj?.groupName || custObj?.name || "Customer Group";

      if (selectedGroupCodesOrNames.length > 0) {
        let matches: boolean;

        if (formData.sortingOption === "groupMemberwise") {
          // Group Memberwise: match by member ID or member name
          const memberId = custMaster?.id || p.CustomerMasterId;
          const memberName = custMaster
            ? [custMaster.salutation, custMaster.firstName, custMaster.middleName, custMaster.lastName].filter(Boolean).join(" ").trim()
            : custObj?.name || "Policy Holder";
          const selectedMemberIds = new Set(
            (formData.sortingFilterSelection?.selectedItems || []).map((item) => item.id)
          );
          matches = Boolean(memberId) && selectedMemberIds.has(memberId);
        } else {
          // All other sorting modes: fuzzy match against group code, group head name
          matches = selectedGroupCodesOrNames.some(
            (sc) => gCode.toLowerCase().includes(sc) || gHeadName.toLowerCase().includes(sc)
          );
        }
        if (!matches) return;
      }

      const memberName = custMaster
        ? [custMaster.salutation, custMaster.firstName, custMaster.middleName, custMaster.lastName].filter(Boolean).join(" ")
        : custObj?.name || "Policy Holder";

      const memberMobile = custMaster?.contactInfo?.mobile1 || custObj?.mobile || custObj?.mobile1 || "";
      const memberEmail = custMaster?.contactInfo?.emailPersonal || custObj?.email || "";
      let memberAddress = "";
      if (custMaster?.addresses && custMaster.addresses.length > 0) {
        const addr = custMaster.addresses[0];
        memberAddress = [addr.addressLine1, addr.addressLine2, addr.city, addr.state, addr.pin].filter(Boolean).join(", ");
      } else if (custObj?.address) {
        memberAddress = custObj.address;
      }

      const md = getPolicyMaturityDate(p) || new Date();

      if (!groupMap[gCode]) {
        groupMap[gCode] = { groupCode: gCode, groupHeadName: gHeadName, membersMap: {}, totalPolicies: 0, totalNetPayable: 0 };
      }
      const grp = groupMap[gCode];

      if (!grp.membersMap[memberName]) {
        grp.membersMap[memberName] = {
          name: memberName,
          mobile: memberMobile,
          email: memberEmail,
          address: memberAddress,
          policies: [],
          totalNetPayable: 0,
        };
      }
      const mem = grp.membersMap[memberName];

      const row = buildRow(p, md);
      mem.policies.push(row);
      mem.totalNetPayable += row.netMaturityPayable;
      grp.totalPolicies += 1;
      grp.totalNetPayable += row.netMaturityPayable;
    });

    return Object.values(groupMap).map((grp: any) => ({ ...grp, members: Object.values(grp.membersMap) }));
  }, [rawPolicies, formData]);

  const grandTotal = groupData.reduce((acc, g) => acc + g.totalNetPayable, 0);
  const grandPolicies = groupData.reduce((acc, g) => acc + g.totalPolicies, 0);

  const getReportHeaderTitle = () => {
    switch (formData.sortingOption) {
      case "groupMemberwise":
        return "Memberwise";
      case "branchNoWise":
        return "Branchwise";
      case "maturityDatewise":
        return "Maturity Datewise";
      default:
        return "Groupwise";
    }
  };

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    const toastId = toast.loading("Generating PDF report...");

    const elem = reportRef.current;
    const originalWidth = elem.style.width;

    try {
      // Temporarily lock to a fixed print width for consistent, sharp scale
      elem.style.width = "900px";

      const canvas = await html2canvas(elem, {
        scale: 2, // 2x is plenty sharp for A4 print
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      // Restore full width screen styling
      elem.style.width = originalWidth;

      const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4", compress: true });
      const pageWidthMm = 210;
      const pageHeightMm = 297;

      // How many canvas pixels fit on one A4 page at this width
      const pxPerMm = canvas.width / pageWidthMm;
      const pageHeightPx = Math.floor(pageHeightMm * pxPerMm);

      let renderedPx = 0;
      let pageIndex = 0;

      while (renderedPx < canvas.height - 5) {
        const sliceHeightPx = Math.min(pageHeightPx, canvas.height - renderedPx);

        // Each PDF page gets ONLY its own slice (not the whole canvas again)
        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        pageCanvas.height = sliceHeightPx;
        const ctx = pageCanvas.getContext("2d");
        if (!ctx) throw new Error("Canvas context not available");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        ctx.drawImage(
          canvas,
          0, renderedPx, canvas.width, sliceHeightPx, // source slice
          0, 0, canvas.width, sliceHeightPx           // destination
        );

        // JPEG @ 0.85 is ~10x smaller than PNG for text-heavy pages
        const imgData = pageCanvas.toDataURL("image/jpeg", 0.85);
        if (pageIndex > 0) pdf.addPage();
        pdf.addImage(
          imgData,
          "JPEG",
          0,
          0,
          pageWidthMm,
          sliceHeightPx / pxPerMm,
          undefined,
          "FAST"
        );

        renderedPx += sliceHeightPx;
        pageIndex += 1;
      }

      pdf.save(`Policy_Maturity_${formData.reportDate || "Report"}.pdf`);
      toast.success("PDF downloaded successfully!", { id: toastId });
    } catch (err: any) {
      console.error(err);
      elem.style.width = originalWidth;
      toast.error(err?.message || "Failed to generate PDF.", { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };


  const BLACK = "#000";
  const thStyle: React.CSSProperties = {
    borderTop: `1px solid ${BLACK}`,
    borderBottom: `1px solid ${BLACK}`,
    verticalAlign: "bottom",
  };
  const totalValueStyle: React.CSSProperties = {
    display: "inline-block",
    borderTop: `1px solid ${BLACK}`,
    borderBottom: `3px double ${BLACK}`,
    padding: "1px 2px",
  };

  const reportDateStr = fmtDate(formData.reportDate) || fmtDate(new Date());

  const renderTotalRow = (
    key: string,
    label: string,
    leftText: string | null,
    total: number
  ) => (
    <tr key={key} className="font-bold">
      <td colSpan={columns.length - 1} className="px-1 pt-1.5 pb-1">
        <div className="flex justify-between">
          <span>{leftText}</span>
          <span className="pr-3">{label}</span>
        </div>
      </td>
      <td className="px-1 pt-1.5 pb-1 text-right font-mono whitespace-nowrap">
        <span style={totalValueStyle}>{total.toLocaleString("en-IN")}</span>
      </td>
    </tr>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm print:hidden">
        <div className="flex items-center gap-3">
          <button onClick={onBackToForm} className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-slate-500 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition uppercase tracking-wider">
            <ArrowLeft size={16} />
            <span>Edit Filters</span>
          </button>
          <span className="text-xs bg-blue-50 text-[#1877F2] font-bold px-3 py-1 rounded-full border border-blue-200 uppercase tracking-wider">{getReportHeaderTitle()}</span>
        </div>
        <button
          onClick={handleDownloadPDF}
          disabled={isExporting}
          className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-[#5c67ff] to-[#3a47ff] text-white font-bold text-xs rounded-xl shadow-md shadow-blue-200 hover:brightness-110 transition disabled:opacity-50 uppercase tracking-wider"
        >
          <Download size={16} />
          <span>{isExporting ? "Exporting..." : "Download PDF"}</span>
        </button>
      </div>

      {/* Printable Statement — plain LIC-style register (same look as Policy Register) */}
      <div
        ref={reportRef}
        style={{ fontFamily: "Arial, Helvetica, sans-serif", color: BLACK }}
        className="w-full bg-white px-6 py-6 border border-slate-300 shadow-xl text-[10px] leading-snug print:p-0 print:border-none print:shadow-none"
      >
        {/* Report title line */}
        <div className="flex justify-between items-end pb-0.5 text-[11px] font-semibold">
          <span>
            Policy Maturity — {getReportHeaderTitle()} as on {reportDateStr}
          </span>
          <span>
            Groups: {groupData.length} | Policies: {grandPolicies}
          </span>
        </div>
        <div className="pb-1 text-[9px] font-normal">
          Maturities between {fmtDate(formData.fromMaturityDate)} and {fmtDate(formData.toMaturityDate)}
        </div>

        {groupData.length === 0 ? (
          <div className="mt-6 py-16 text-center border border-dashed border-slate-400 p-8 space-y-2">
            <h3 className="font-bold text-sm">No Maturing Policies Found</h3>
            <p className="text-xs">
              There are no policies maturing in the selected date range matching your filter criteria.
            </p>
          </div>
        ) : (
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="font-bold">
                {columns.map((col) => (
                  <th key={col.key} className={`px-1 py-1 ${alignClass(col.align)}`} style={thStyle}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>

            {groupData.map((group) => (
              <tbody key={group.groupCode}>
                {/* Centered group heading */}
                <tr>
                  <td colSpan={columns.length} className="pt-3 pb-1 text-center">
                    <div className="text-[13px] font-bold">
                      {group.groupCode}: {group.groupHeadName}
                    </div>
                  </td>
                </tr>

                {group.members.map((member: any) => (
                  <Fragment key={member.name}>
                    {/* Member name (bold) */}
                    <tr>
                      <td colSpan={columns.length} className="pt-2 pb-0.5 text-[11px] font-bold">
                        {member.name}
                        {(formData.reportOptions.printAddress || formData.reportOptions.printTelNo) && (
                          <div className="text-[9px] font-normal">
                            {[
                              formData.reportOptions.printAddress && member.address && `Address: ${member.address}`,
                              formData.reportOptions.printTelNo && member.mobile && `Tel/Mob: ${member.mobile}`,
                            ].filter(Boolean).join(" | ")}
                          </div>
                        )}
                      </td>
                    </tr>

                    {member.policies.map((p: any) => (
                      <tr key={p.policyNo}>
                        {columns.map((col) => (
                          <td
                            key={col.key}
                            className={`px-1 py-0.5 whitespace-nowrap ${alignClass(col.align)}`}
                          >
                            {col.render(p)}
                          </td>
                        ))}
                      </tr>
                    ))}

                    {/* Member total — only when it adds information */}
                    {member.policies.length > 1 &&
                      group.members.length > 1 &&
                      renderTotalRow(`mt-${member.name}`, "Member Total :", null, member.totalNetPayable)}
                  </Fragment>
                ))}

                {/* Group total */}
                {group.totalPolicies > 1 &&
                  renderTotalRow(
                    `gt-${group.groupCode}`,
                    "Group Total :",
                    `Total Policies for Group : ${group.totalPolicies}`,
                    group.totalNetPayable
                  )}

                {/* Thin separator line between groups */}
                <tr>
                  <td
                    colSpan={columns.length}
                    style={{ borderBottom: `1px solid ${BLACK}`, height: 6 }}
                  ></td>
                </tr>
              </tbody>
            ))}
          </table>
        )}

        {/* Grand summary */}
        {groupData.length > 0 && (
          <div className="pt-5 flex justify-end">
            <table className="w-full max-w-sm border-collapse text-[11px]">
              <thead>
                <tr className="font-bold">
                  <th className="px-1 py-1 text-left" style={thStyle}>Summary</th>
                  <th className="px-1 py-1 text-right" style={thStyle}>Net Payable</th>
                </tr>
              </thead>
              <tbody>
                <tr className="font-bold">
                  <td className="px-1 pt-1.5 pb-1">Grand Total (Net Payable)</td>
                  <td className="px-1 pt-1.5 pb-1 text-right font-mono">
                    <span style={totalValueStyle}>{grandTotal.toLocaleString("en-IN")}</span>
                  </td>
                </tr>
                <tr className="font-bold">
                  <td className="px-1 py-1">Total No. of Policies</td>
                  <td className="px-1 py-1 text-right font-mono">{grandPolicies}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Legend footer */}
        <div className="pt-5 mt-4 space-y-1 text-[9px]" style={{ borderTop: `1px solid ${BLACK}` }}>
          <div className="flex flex-wrap gap-x-5 gap-y-0.5">
            <span><strong>Y :</strong> Policies with NACH Mode</span>
            <span><strong>A :</strong> Policies with APPS Mode</span>
            <span><strong>ρ :</strong> Pan Card is register for the Policy</span>
          </div>
          <p>
            Vested Bonus &amp; F.A.B are estimated at placeholder rates (₹{VESTED_BONUS_RATE_PER_1000_PA}/1000 SA p.a. and ₹{FAB_RATE_PER_1000}/1000 SA) — replace with your declared bonus rate table for accurate figures.
          </p>
          <div className="flex justify-between font-mono text-[8px] pt-1">
            <span>Statement Code: DSS000019899</span>
            <span>Generated via Policy Maturity Engine</span>
          </div>
        </div>
      </div>
    </div>
  );
}