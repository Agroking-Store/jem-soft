"use client";

import { useRef, useState, useMemo } from "react";
import { ArrowLeft, Download, FilterX, Printer } from "lucide-react";
import { CustomerDataSheetFormData } from "./CustomerDataSheetForm";
import type { Customer, CustomerMaster } from "@/features/customers/types";
import type { Policy } from "@/features/policy/policySlice";
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";
import toast from "react-hot-toast";

interface CustomerDataSheetReportViewProps {
  formData: CustomerDataSheetFormData;
  customers: Customer[];
  customersMaster: CustomerMaster[];
  policies: Policy[];
  onBackToForm: () => void;
}

const BLACK = "#000";
const thStyle = {
  borderTop: `1px solid ${BLACK}`,
  borderBottom: `1px solid ${BLACK}`,
  verticalAlign: "bottom",
} as const;
const totalValueStyle = {
  display: "inline-block",
  borderTop: `1px solid ${BLACK}`,
  borderBottom: `3px double ${BLACK}`,
  padding: "1px 2px",
} as const;

export default function CustomerDataSheetReportView({
  formData,
  customers = [],
  customersMaster = [],
  policies = [],
  onBackToForm,
}: CustomerDataSheetReportViewProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Format date helper DD/MM/YYYY
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return dateStr || "";
    }
  };

  // Format short date DD/MM/YY
  const formatShortDate = (dateStr?: string | null) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = String(d.getFullYear()).slice(-2);
      return `${day}/${month}/${year}`;
    } catch {
      return dateStr || "";
    }
  };

  // Resolve target members to generate data sheets for
  const targetMembers = useMemo(() => {
    const applied = formData.appliedFilters || [];

    if (applied.length > 0) {
      const memberIds = new Set<string>();
      const groupIds = new Set<string>();

      applied.forEach((f) => {
        if (f.memberId) memberIds.add(f.memberId);
        if (f.groupId) groupIds.add(f.groupId);
        if (f.type === "Group Memberwise") {
          memberIds.add(f.id);
        } else if (f.type === "Groups Wise" || f.type === "Groups") {
          groupIds.add(f.id);
        }
      });

      const filteredMembers = customersMaster.filter((cm) => {
        if (memberIds.has(cm.id)) return true;
        if (cm.groupId && groupIds.has(cm.groupId)) return true;
        return false;
      });

      if (filteredMembers.length > 0) {
        return filteredMembers;
      }

      // Fallback
      return customers
        .filter((c) => groupIds.has(c.id) || memberIds.has(c.id))
        .map((c) => ({
          id: c.id,
          groupId: c.id,
          salutation: "Mr.",
          firstName: c.name,
          lastName: "",
          group: c,
          addresses: [
            {
              id: "addr-" + c.id,
              customerId: c.id,
              addressType: "Residence",
              addressLine1: c.resAddressLine1,
              addressLine2: c.resAddressLine2,
              city: c.resCity,
              pin: c.resPin,
              state: c.resState,
            },
          ],
          contactInfo: {
            mobile1: c.phone || c.mobilePersonal,
            emailPersonal: c.email || c.emailPersonal,
          },
          createdAt: c.createdAt || new Date().toISOString(),
          updatedAt: c.updatedAt || new Date().toISOString(),
        } as unknown as CustomerMaster));
    }

    if (customersMaster && customersMaster.length > 0) {
      return customersMaster;
    }

    return customers.map((c) => ({
      id: c.id,
      groupId: c.id,
      salutation: "Mr.",
      firstName: c.name,
      lastName: "",
      group: c,
      addresses: [
        {
          id: "addr-" + c.id,
          customerId: c.id,
          addressType: "Residence",
          addressLine1: c.resAddressLine1,
          city: c.resCity,
        },
      ],
      contactInfo: {
        mobile1: c.phone,
        emailPersonal: c.email,
      },
      createdAt: c.createdAt || new Date().toISOString(),
      updatedAt: c.updatedAt || new Date().toISOString(),
    } as unknown as CustomerMaster));
  }, [formData.appliedFilters, customersMaster, customers]);

  // Handle PDF Export matching Policy Register standards
  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    const toastId = toast.loading("Exporting Executive Customer Data Sheet PDF...");

    const elem = reportRef.current;
    const originalWidth = elem.style.width;

    try {
      elem.style.width = "1050px";

      const canvas = await html2canvas(elem, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      elem.style.width = originalWidth;

      const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4", compress: true });
      const pageWidthMm = 210;
      const pageHeightMm = 297;
      const pxPerMm = canvas.width / pageWidthMm;
      const pageHeightPx = Math.floor(pageHeightMm * pxPerMm);

      // Each PDF page gets ONLY its own slice, compressed as JPEG (keeps file small)
      let renderedPx = 0;
      let pageIndex = 0;
      while (renderedPx < canvas.height - 5) {
        const sliceHeightPx = Math.min(pageHeightPx, canvas.height - renderedPx);
        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        pageCanvas.height = sliceHeightPx;
        const ctx = pageCanvas.getContext("2d");
        if (!ctx) throw new Error("Canvas context not available");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        ctx.drawImage(canvas, 0, renderedPx, canvas.width, sliceHeightPx, 0, 0, canvas.width, sliceHeightPx);
        const imgData = pageCanvas.toDataURL("image/jpeg", 0.85);
        if (pageIndex > 0) pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, 0, pageWidthMm, sliceHeightPx / pxPerMm, undefined, "FAST");
        renderedPx += sliceHeightPx;
        pageIndex += 1;
      }

      pdf.save(`Customer_Data_Sheet_${formData.reportDate || "Report"}.pdf`);
      toast.success("Executive PDF exported successfully!", { id: toastId });
    } catch (err: any) {
      console.error(err);
      elem.style.width = originalWidth;
      toast.error(err?.message || "Failed to generate PDF.", { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 w-full">
      {/* Top Action Control Bar — FULL WIDTH matching Policy Register */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm print:hidden w-full">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToForm}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-500 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition uppercase tracking-wider cursor-pointer"
          >
            <ArrowLeft size={16} />
            <span>Edit Filters</span>
          </button>
          <span className="text-xs bg-blue-50 text-[#1877F2] font-bold px-3 py-1.5 rounded-full border border-blue-200 uppercase tracking-wider">
            Customer Data Sheet Statement
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-500 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition uppercase tracking-wider cursor-pointer"
          >
            <Printer size={16} />
            <span>Print</span>
          </button>
          <button
            onClick={handleExportPDF}
            disabled={isExporting}
            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-[#5c67ff] to-[#3a47ff] text-white font-bold text-xs rounded-xl shadow-md shadow-blue-200 hover:brightness-110 transition disabled:opacity-50 uppercase tracking-wider cursor-pointer"
          >
            <Download size={16} />
            <span>{isExporting ? "Exporting PDF..." : "Download PDF"}</span>
          </button>
        </div>
      </div>

      {/* Main Printable Document Canvas */}
      <div
        ref={reportRef}
        style={{ fontFamily: "Arial, Helvetica, sans-serif", color: BLACK }}
        className="w-full bg-white px-6 py-6 border border-slate-300 shadow-xl space-y-8 print:p-0 print:border-none print:shadow-none"
      >
        {targetMembers.map((member, mIdx) => {
          const group =
            customers.find((c) => c.id === member.groupId) || member.group;
          const groupCode = group?.groupCode || "000007";
          const groupHeadName =
            (group as any)?.name || group?.groupName || "Mrs. NADGAUDA TRUPTI";

          const memberFullName = [
            member.salutation,
            member.firstName,
            member.middleName,
            member.lastName,
          ]
            .filter(Boolean)
            .join(" ")
            .trim();

          // Addresses
          const resAddress =
            member.addresses?.find((a) => a.addressType === "Residence") ||
            member.addresses?.[0];
          const offAddress = member.addresses?.find((a) => a.addressType === "Office");

          const resAddressStr = resAddress
            ? [
                resAddress.addressLine1,
                resAddress.addressLine2,
                resAddress.addressLine3,
                resAddress.area,
                resAddress.city,
                resAddress.state,
                resAddress.pin,
              ]
                .filter(Boolean)
                .join(", ")
            : [
                (group as any)?.resAddressLine1,
                (group as any)?.resAddressLine2,
                (group as any)?.resCity,
                (group as any)?.resState,
                (group as any)?.resPin,
              ]
                .filter(Boolean)
                .join(", ");

          const offAddressStr = offAddress
            ? [
                offAddress.addressLine1,
                offAddress.addressLine2,
                offAddress.city,
                offAddress.state,
                offAddress.pin,
              ]
                .filter(Boolean)
                .join(", ")
            : [(group as any)?.offAddressLine1, (group as any)?.offCity, (group as any)?.offPin]
                .filter(Boolean)
                .join(", ");

          // Contact info
          const contact = member.contactInfo;
          const telRes = [contact?.landline1Std, contact?.landline1Number]
            .filter(Boolean)
            .join("-");
          const telOff = [contact?.landline2Std, contact?.landline2Number]
            .filter(Boolean)
            .join("-");
          const mobile = contact?.mobile1 || (group as any)?.phone || "";
          const email = contact?.emailPersonal || (group as any)?.email || "";
          const fax = [contact?.faxStd, contact?.faxNumber].filter(Boolean).join("-");

          // Misc Info
          const misc = member.miscInfo;

          // Medical details
          const medicalRecord = member.medicalHistories?.[0]?.records?.[0];

          // Family history records
          const familyRecords = member.familyHistories?.[0]?.records || [];

          // Policies for this member
          const memberPolicies = policies.filter(
            (p) =>
              p.CustomerMasterId === member.id ||
              p.CustomerMaster?.id === member.id ||
              p.clientId === member.id ||
              p.clientId === group?.id
          );

          const totalSumAssured = memberPolicies.reduce(
            (sum, p) => sum + (Number(p.premium?.sumAssured) || 0),
            0
          );
          const totalPremiumAnnual = memberPolicies.reduce(
            (sum, p) =>
              sum +
              (Number(p.premium?.totalYearlyPremium) ||
                Number(p.premium?.installmentPremium) ||
                0),
            0
          );
          const totalSARated = totalSumAssured;

          return (
            <div
              key={member.id || mIdx}
              className={`text-[10px] leading-snug ${mIdx > 0 ? "pt-6" : ""}`}
              style={mIdx > 0 ? { borderTop: `1px solid ${BLACK}` } : undefined}
            >
              {/* Title line */}
              <div className="flex justify-between items-end pb-1 text-[11px] font-semibold">
                <span>
                  Master Customer Data Sheet of {memberFullName || "Client"} as on {formatDate(formData.reportDate)}
                </span>
                <span>Group Code : {groupCode} | Personal Code : {mIdx + 1}</span>
              </div>

              {/* Group / address / contact */}
              <div className="py-1.5 space-y-1" style={{ borderTop: `1px solid ${BLACK}`, borderBottom: `1px solid ${BLACK}` }}>
                <div className="flex gap-8">
                  <span>Group Code : <strong className="font-mono">{groupCode}</strong></span>
                  <span>Personal Code : <strong>{mIdx + 1}</strong></span>
                  <span>Group Head : <strong>{groupHeadName}</strong></span>
                </div>
                <div className="grid grid-cols-2 gap-8">
                  <div><strong>Resident Address :</strong> {resAddressStr || "-"}</div>
                  <div><strong>Office Address :</strong> {offAddressStr || "-"}</div>
                </div>
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-0.5">
                    <div>Tel No.(R) : <span className="font-mono">{telRes || "-"}</span></div>
                    <div>Fax No. : <span className="font-mono">{fax || "-"}</span></div>
                    <div>Mobile : <span className="font-mono font-bold">{mobile || "-"}</span></div>
                  </div>
                  <div className="space-y-0.5">
                    <div>Tel No. (O) : <span className="font-mono">{telOff || "-"}</span></div>
                    <div>E-mail : {email || "-"}</div>
                    <div>Location : {resAddress?.city || (group as any)?.resCity || "Pune"}</div>
                  </div>
                </div>
              </div>

              {/* Personal Information */}
              <div className="pt-3">
                <div className="text-[11px] font-bold pb-0.5" style={{ borderBottom: `1px solid ${BLACK}` }}>
                  Personal Information
                </div>
                <div className="pt-1.5 grid grid-cols-12 gap-x-4 gap-y-1">
                  <div className="col-span-5">Birth Date (Rec) : <strong className="font-mono">{formatDate(member.dob || "") || "-"}</strong></div>
                  <div className="col-span-4">Birth Date (Greeting) : <strong className="font-mono">{formatDate(misc?.dobForGreetings || member.dob || "") || "-"}</strong></div>
                  <div className="col-span-3">Birth Place : -</div>

                  <div className="col-span-5">Age Proof : -</div>
                  <div className="col-span-4">Nationality : {misc?.nationality || "Indian"}</div>
                  <div className="col-span-3">PAN : <strong className="font-mono">{member.panNumber || "-"}</strong></div>

                  <div className="col-span-5">Father&apos;s Name : {misc?.fatherName || "-"}</div>
                  <div className="col-span-4">Mother&apos;s Name : {misc?.motherName || "-"}</div>
                  <div className="col-span-3">Marriage Date : {formatDate(misc?.marriageDate || "") || "-"}</div>

                  <div className="col-span-5">Spouse Name : {misc?.spouseName || "-"}</div>
                  <div className="col-span-7">AadhaarCard No : <strong className="font-mono">{member.aadhaarNumber || "-"}</strong></div>

                  <div className="col-span-5">Qualification : {misc?.qualification || "-"}</div>
                  <div className="col-span-7">Income Sources : -</div>

                  <div className="col-span-5">Occupation : {misc?.occupation || "-"}</div>
                  <div className="col-span-7">Annual Income : {misc?.incomeSlab || "-"}</div>

                  <div className="col-span-5">Duties : {misc?.natureOfDuties || "-"}</div>
                  <div className="col-span-7">Employer : {misc?.employer || "-"}</div>

                  <div className="col-span-5">Length of Service : -</div>
                  <div className="col-span-7">Remarks : {misc?.specialNote || "-"}</div>
                </div>
              </div>

              {/* Medical Detail */}
              <div className="pt-3">
                <div className="text-[11px] font-bold pb-0.5" style={{ borderBottom: `1px solid ${BLACK}` }}>
                  Medical Detail
                </div>
                <div className="pt-1.5 grid grid-cols-12 gap-x-6">
                  <div className="col-span-8 space-y-1">
                    <div className="grid grid-cols-2 gap-2">
                      <div>Medical Date : <span className="font-mono">{formatDate(medicalRecord?.medicalExaminationDate || "") || "-"}</span></div>
                      <div>Medical History Date : <span className="font-mono">{formatDate(medicalRecord?.medicalHistoryDate || "") || "-"}</span></div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>Doctor Name : {medicalRecord?.doctorName || "-"}</div>
                      <div>Limit : -</div>
                    </div>
                    <div>Identification : {medicalRecord?.identificationMark || "-"}</div>
                    <div>Major Illness : {medicalRecord?.majorIllness || "-"}</div>
                    <div>Operation : {medicalRecord?.operationAccident || "-"}</div>
                    <div>Special Report : {medicalRecord?.specialReport || "-"}</div>
                    <div>Last Mens Date : -</div>
                    <div>Last Delivery Date : -</div>
                  </div>

                  <div className="col-span-4">
                    <table className="w-full border-collapse">
                      <tbody>
                        {[
                          ["Height", medicalRecord?.height],
                          ["Weight", medicalRecord?.weight],
                          ["Chest", medicalRecord?.chest],
                          ["Abdomen", medicalRecord?.abdomen],
                          ["Blood Group", medicalRecord?.bloodGroup],
                          ["Pulse", medicalRecord?.pulse],
                          ["Spectacles", medicalRecord?.spectaclesDetails],
                          ["Dental", medicalRecord?.dentalDetails],
                          ["B.P", medicalRecord?.bloodPressure],
                        ].map(([label, val]) => (
                          <tr key={label as string}>
                            <td className="py-0.5 pr-2 font-semibold">{label}</td>
                            <td className="py-0.5 text-right font-mono">{(val as any) || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Family History */}
              <div className="pt-3">
                <div className="text-[11px] font-bold pb-0.5" style={{ borderBottom: `1px solid ${BLACK}` }}>
                  Family History
                  <span className="font-normal ml-3">
                    Date : {formatDate(member.familyHistories?.[0]?.date || "") || "-"}
                  </span>
                </div>
                <table className="w-full text-left border-collapse mt-1">
                  <thead>
                    <tr className="font-bold">
                      <th className="px-1 py-1" style={thStyle}>Relation</th>
                      <th className="px-1 py-1 text-center" style={thStyle}>Present Age</th>
                      <th className="px-1 py-1" style={thStyle}>Health</th>
                      <th className="px-1 py-1 text-center" style={thStyle}>Age at Death</th>
                      <th className="px-1 py-1" style={thStyle}>Cause of Death</th>
                    </tr>
                  </thead>
                  <tbody>
                    {familyRecords.length > 0 ? (
                      familyRecords.map((fRec, fIdx) => (
                        <tr key={fRec.id || fIdx}>
                          <td className="px-1 py-0.5">{fRec.relation}</td>
                          <td className="px-1 py-0.5 text-center font-mono">{fRec.isDead ? "-" : fRec.age}</td>
                          <td className="px-1 py-0.5">{fRec.stateOfHealth || "-"}</td>
                          <td className="px-1 py-0.5 text-center font-mono">
                            {fRec.isDead ? fRec.ageAtDeath || fRec.age : "-"}
                          </td>
                          <td className="px-1 py-0.5">{fRec.causeOfDeath || "-"}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="px-1 py-0.5">-</td>
                        <td className="px-1 py-0.5 text-center">-</td>
                        <td className="px-1 py-0.5">-</td>
                        <td className="px-1 py-0.5 text-center">-</td>
                        <td className="px-1 py-0.5">-</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Bank Details */}
              {formData.reportOptions.printBankDetails && (
                <div className="pt-3">
                  <div className="text-[11px] font-bold pb-0.5" style={{ borderBottom: `1px solid ${BLACK}` }}>
                    Bank Details
                  </div>
                  <div className="pt-1.5 space-y-1">
                    {member.bankDetails && member.bankDetails.length > 0 ? (
                      member.bankDetails.map((b, bIdx) => (
                        <div key={b.id || bIdx} className="grid grid-cols-12 gap-x-4 gap-y-0.5">
                          <div className="col-span-4">Bank Name : <strong>{b.bankName || "-"}</strong></div>
                          <div className="col-span-4">Branch : <strong>{b.bankBranch || "-"}</strong></div>
                          <div className="col-span-4">Account No : <strong className="font-mono">{b.accountNumber || "-"}</strong></div>
                          <div className="col-span-4">IFSC : <strong className="font-mono">{b.ifscCode || "-"}</strong></div>
                          <div className="col-span-4">Account Type : <strong>{b.accountType || "-"}</strong></div>
                          <div className="col-span-4">MICR : <span className="font-mono">{b.micrNumber || "-"}</span></div>
                        </div>
                      ))
                    ) : (
                      <div className="italic">No bank records registered</div>
                    )}
                  </div>
                </div>
              )}

              {/* Policy Details */}
              <div className={`pt-3 ${formData.reportOptions.printPolicyOnNewPage ? "page-break-before" : ""}`}>
                <div className="text-[11px] font-bold pb-0.5" style={{ borderBottom: `1px solid ${BLACK}` }}>
                  Policy Details
                </div>
                <table className="w-full text-left border-collapse text-[9px] mt-1">
                  <thead>
                    <tr className="font-bold">
                      <th className="px-1 py-1" style={thStyle}>Policy No</th>
                      <th className="px-1 py-1 text-center" style={thStyle}>Com.<br />Date</th>
                      <th className="px-1 py-1 text-center" style={thStyle}>Pl/Tm/Pt</th>
                      <th className="px-1 py-1 text-right" style={thStyle}>Sum</th>
                      <th className="px-1 py-1 text-right" style={thStyle}>Premium</th>
                      <th className="px-1 py-1 text-center" style={thStyle}>Md.</th>
                      <th className="px-1 py-1 text-center" style={thStyle}>Ag<br />Cd</th>
                      <th className="px-1 py-1 text-center" style={thStyle}>Brn.</th>
                      <th className="px-1 py-1" style={thStyle}>Nominee</th>
                      <th className="px-1 py-1 text-center" style={thStyle}>Rel.</th>
                      <th className="px-1 py-1 text-center" style={thStyle}>F.U.P.<br />Date</th>
                      <th className="px-1 py-1 text-center" style={thStyle}>Med/<br />NM</th>
                      <th className="px-1 py-1 text-center" style={thStyle}>DAB</th>
                      <th className="px-1 py-1 text-right" style={thStyle}>Extra<br />Prem.</th>
                      <th className="px-1 py-1 text-right" style={thStyle}>SA<br />Rated</th>
                      <th className="px-1 py-1 text-center" style={thStyle}>Duly Tax<br />Ben.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {memberPolicies.map((pol) => {
                      const planNum = pol.product?.planNumber || pol.product?.productName || "14";
                      const term = pol.policyTerm || 25;
                      const ppt = pol.premiumPayingTerm || term;
                      const plTmPt = `${planNum}/${term}/${ppt}`;
                      const sumAssured = Number(pol.premium?.sumAssured) || 0;
                      const premiumAmt =
                        Number(pol.premium?.installmentPremium) ||
                        Number(pol.premium?.totalYearlyPremium) ||
                        0;
                      const modeStr = pol.premiumMode?.modeName?.substring(0, 3) || "Yly.";
                      const agCd = pol.agentCode || "Oth";
                      const branchCd = pol.branch?.branchCode || "952";
                      const nominee = pol.nominees?.[0]?.nomineeName || "";
                      const nomineeRel = pol.nominees?.[0]?.relationship || "";
                      const fupDate = formatShortDate(pol.nextPremiumDueDate || pol.commencementDate);

                      return (
                        <tr key={pol.id}>
                          <td className="px-1 py-0.5 font-mono whitespace-nowrap">{pol.policyNumber}</td>
                          <td className="px-1 py-0.5 text-center whitespace-nowrap">{formatShortDate(pol.commencementDate)}</td>
                          <td className="px-1 py-0.5 text-center whitespace-nowrap">{plTmPt}</td>
                          <td className="px-1 py-0.5 text-right whitespace-nowrap">{sumAssured.toLocaleString("en-IN")}</td>
                          <td className="px-1 py-0.5 text-right whitespace-nowrap">{premiumAmt.toFixed(2)}</td>
                          <td className="px-1 py-0.5 text-center">{modeStr}</td>
                          <td className="px-1 py-0.5 text-center">{agCd}</td>
                          <td className="px-1 py-0.5 text-center">{branchCd}</td>
                          <td className="px-1 py-0.5">{nominee || "-"}</td>
                          <td className="px-1 py-0.5 text-center">{nomineeRel || "-"}</td>
                          <td className="px-1 py-0.5 text-center whitespace-nowrap">{fupDate || "-"}</td>
                          <td className="px-1 py-0.5 text-center">M</td>
                          <td className="px-1 py-0.5 text-center">35</td>
                          <td className="px-1 py-0.5 text-right">0.00</td>
                          <td className="px-1 py-0.5 text-right whitespace-nowrap">{sumAssured.toLocaleString("en-IN")}</td>
                          <td className="px-1 py-0.5 text-center">self</td>
                        </tr>
                      );
                    })}

                    {memberPolicies.length === 0 && (
                      <tr>
                        <td colSpan={16} className="py-3 text-center italic">
                          No active policies registered for this client
                        </td>
                      </tr>
                    )}

                    <tr className="font-bold">
                      <td colSpan={3} className="px-1 pt-1.5 pb-1 text-right pr-3">Total :</td>
                      <td className="px-1 pt-1.5 pb-1 text-right font-mono whitespace-nowrap">
                        <span style={totalValueStyle}>{totalSumAssured.toLocaleString("en-IN")}</span>
                      </td>
                      <td className="px-1 pt-1.5 pb-1 text-right font-mono whitespace-nowrap">
                        <span style={totalValueStyle}>{totalPremiumAnnual.toFixed(2)}</span>
                      </td>
                      <td colSpan={9} className="px-1 pt-1.5 pb-1 text-left">p.a.</td>
                      <td className="px-1 pt-1.5 pb-1 text-right font-mono whitespace-nowrap">
                        <span style={totalValueStyle}>{totalSARated.toLocaleString("en-IN")}</span>
                      </td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {formData.reportOptions.printRemarksInPolicy && (
                <div className="pt-2 italic">
                  Remarks : {member.miscInfo?.specialNote || "All policy certificates verified."}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}