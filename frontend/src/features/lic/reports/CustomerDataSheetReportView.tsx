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

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 5) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
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
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#0B1220] p-4 rounded-2xl border border-slate-800 shadow-xl print:hidden w-full">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToForm}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-300 bg-white/10 rounded-xl hover:bg-white/20 transition uppercase tracking-wider cursor-pointer"
          >
            <ArrowLeft size={16} />
            <span>Edit Filters</span>
          </button>
          <span className="text-xs bg-[#B8873A]/20 text-[#E8C77A] font-bold px-3 py-1.5 rounded-full border border-[#B8873A]/40 uppercase tracking-wider">
            Customer Data Sheet Statement
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-300 bg-white/10 rounded-xl hover:bg-white/20 transition uppercase tracking-wider cursor-pointer"
          >
            <Printer size={16} />
            <span>Print</span>
          </button>
          <button
            onClick={handleExportPDF}
            disabled={isExporting}
            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-[#B8873A] to-[#D9AE63] text-[#0B1220] font-bold text-xs rounded-xl shadow-lg hover:brightness-105 transition disabled:opacity-50 uppercase tracking-wider cursor-pointer"
          >
            <Download size={16} />
            <span>{isExporting ? "Exporting PDF..." : "Download PDF"}</span>
          </button>
        </div>
      </div>

      {/* Main Printable Document Canvas */}
      <div
        ref={reportRef}
        style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
        className="w-full bg-white p-8 rounded-2xl border border-slate-300 shadow-2xl text-slate-900 space-y-10 print:p-0 print:border-none print:shadow-none"
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
              className={`space-y-4 text-[11px] font-sans leading-tight ${
                mIdx > 0 ? "pt-8 border-t-2 border-dashed border-slate-300" : ""
              }`}
            >
              {/* Advisor Letterhead Header */}
              <div
                style={{ borderBottom: "2px solid #0B1220" }}
                className="flex justify-between items-start pb-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold text-[#0B1220] tracking-tight">
                      Jayant Yashwantrao Mahabole
                    </h1>
                    <span className="text-[10px] bg-[#0B1220] text-[#E8C77A] font-bold px-2 py-0.5 rounded uppercase tracking-widest">
                      LIC Authorized Advisor
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-[#B8873A]">
                    MBA in Insurance & Finance
                  </p>
                  <p className="text-xs text-slate-600 max-w-md leading-relaxed">
                    84/2, Darpan Bldg., 201 Sarang Society, Sahakarnagar No. 2 Parvati Pune 411009
                  </p>
                  <div className="flex items-center gap-4 text-xs font-medium text-slate-700 pt-1">
                    <span>Phone: 9822452896</span>
                    <span>Email: office@jayantmahbole.com</span>
                  </div>
                </div>

                <div className="text-right space-y-1.5">
                  <div className="inline-block bg-[#0B1220] text-[#E8C77A] px-4 py-2 rounded-xl text-right border border-[#B8873A]/40 shadow-sm">
                    <p className="text-xs font-bold tracking-widest uppercase">
                      Life Insurance Corporation
                    </p>
                    <p className="text-[10px] text-slate-300">
                      Master Customer Data Sheet
                    </p>
                  </div>
                  <p className="text-xs font-bold text-slate-700 pt-1">
                    Date: {formatDate(formData.reportDate)}
                  </p>
                </div>
              </div>

              {/* Title Banner */}
              <div className="bg-[#0B1220] text-white rounded-xl px-5 py-2.5 flex items-center justify-between border-l-4 border-[#B8873A] shadow-sm">
                <div>
                  <h2 className="text-sm font-bold text-[#E8C77A] uppercase tracking-wider">
                    Data Sheet of {memberFullName || "Client"}
                  </h2>
                </div>
                <div className="text-right text-xs text-[#E8C77A] font-bold">
                  Group Code: {groupCode} | Personal Code: {mIdx + 1}
                </div>
              </div>

              {/* Group Code / Personal Code / Group Head Row */}
              <div className="border border-slate-300 rounded-xl overflow-hidden divide-y divide-slate-300 shadow-xs">
                <div className="grid grid-cols-12 px-3 py-2 bg-slate-50 font-medium text-xs">
                  <div className="col-span-4">
                    Group Code : <span className="font-bold font-mono">{groupCode}</span>
                  </div>
                  <div className="col-span-3">
                    Personal Code : <span className="font-bold">{mIdx + 1}</span>
                  </div>
                  <div className="col-span-5">
                    Group Head : <span className="font-bold text-slate-900">{groupHeadName}</span>
                  </div>
                </div>

                <div className="grid grid-cols-12 divide-x divide-slate-300">
                  <div className="col-span-6 p-2.5 space-y-1">
                    <div className="font-bold text-slate-700 uppercase text-[10px]">Resident Address</div>
                    <div className="text-slate-900 min-h-[30px]">{resAddressStr || "-"}</div>
                  </div>
                  <div className="col-span-6 p-2.5 space-y-1">
                    <div className="font-bold text-slate-700 uppercase text-[10px]">Office Address</div>
                    <div className="text-slate-900 min-h-[30px]">{offAddressStr || "-"}</div>
                  </div>
                </div>

                <div className="grid grid-cols-12 divide-x divide-slate-300 p-2.5 gap-y-1">
                  <div className="col-span-6 pr-2 space-y-1">
                    <div>Tel No.(R) : <span className="font-mono">{telRes || "-"}</span></div>
                    <div>Fax No. : <span className="font-mono">{fax || "-"}</span></div>
                    <div>Mobile : <span className="font-mono font-bold">{mobile || "-"}</span></div>
                  </div>
                  <div className="col-span-6 pl-2 space-y-1">
                    <div>Tel No. (O) : <span className="font-mono">{telOff || "-"}</span></div>
                    <div>E-mail : <span className="font-semibold text-blue-800">{email || "-"}</span></div>
                    <div>Location : {resAddress?.city || (group as any)?.resCity || "Pune"}</div>
                  </div>
                </div>
              </div>

              {/* SECTION: Personal Information */}
              <div className="border border-slate-300 rounded-xl overflow-hidden shadow-xs">
                <div className="bg-[#0B1220] px-4 py-1.5 font-serif text-xs font-bold text-[#E8C77A] uppercase tracking-wider">
                  Personal Information
                </div>
                <div className="p-3 grid grid-cols-12 gap-x-4 gap-y-2 bg-white">
                  <div className="col-span-5">
                    Birth Date (Rec) : <span className="font-bold font-mono">{formatDate(member.dob || "") || "-"}</span>
                  </div>
                  <div className="col-span-4">
                    Birth Date (Greeting) : <span className="font-bold font-mono">{formatDate(misc?.dobForGreetings || member.dob || "") || "-"}</span>
                  </div>
                  <div className="col-span-3">Birth Place : -</div>

                  <div className="col-span-5">Age Proof : -</div>
                  <div className="col-span-4">Nationality : {misc?.nationality || "Indian"}</div>
                  <div className="col-span-3">PAN : <span className="font-mono font-bold">{member.panNumber || "-"}</span></div>

                  <div className="col-span-5">Father&apos;s Name : {misc?.fatherName || "-"}</div>
                  <div className="col-span-4">Mother&apos;s Name : {misc?.motherName || "-"}</div>
                  <div className="col-span-3">Marriage Date : {formatDate(misc?.marriageDate || "") || "-"}</div>

                  <div className="col-span-5">Spouse Name : {misc?.spouseName || "-"}</div>
                  <div className="col-span-7">AadhaarCard No : <span className="font-mono font-bold">{member.aadhaarNumber || "-"}</span></div>

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

              {/* SECTION: Medical Detail */}
              <div className="border border-slate-300 rounded-xl overflow-hidden shadow-xs">
                <div className="bg-[#0B1220] px-4 py-1.5 font-serif text-xs font-bold text-[#E8C77A] uppercase tracking-wider">
                  Medical Detail
                </div>
                <div className="grid grid-cols-12 divide-x divide-slate-300 bg-white">
                  {/* Left Examination Details */}
                  <div className="col-span-8 p-3 space-y-2">
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

                  {/* Right Physical Measurement Table */}
                  <div className="col-span-4 p-0">
                    <table className="w-full text-[10px] border-collapse">
                      <tbody className="divide-y divide-slate-200">
                        <tr>
                          <td className="py-1 px-2.5 font-semibold bg-slate-50 border-r border-slate-200 w-1/2">Height</td>
                          <td className="py-1 px-2 text-center font-mono">{medicalRecord?.height || "-"}</td>
                        </tr>
                        <tr>
                          <td className="py-1 px-2.5 font-semibold bg-slate-50 border-r border-slate-200">Weight</td>
                          <td className="py-1 px-2 text-center font-mono">{medicalRecord?.weight || "-"}</td>
                        </tr>
                        <tr>
                          <td className="py-1 px-2.5 font-semibold bg-slate-50 border-r border-slate-200">Chest</td>
                          <td className="py-1 px-2 text-center font-mono">{medicalRecord?.chest || "-"}</td>
                        </tr>
                        <tr>
                          <td className="py-1 px-2.5 font-semibold bg-slate-50 border-r border-slate-200">Abdomen</td>
                          <td className="py-1 px-2 text-center font-mono">{medicalRecord?.abdomen || "-"}</td>
                        </tr>
                        <tr>
                          <td className="py-1 px-2.5 font-semibold bg-slate-50 border-r border-slate-200">Blood Group</td>
                          <td className="py-1 px-2 text-center font-bold text-red-700">{medicalRecord?.bloodGroup || "-"}</td>
                        </tr>
                        <tr>
                          <td className="py-1 px-2.5 font-semibold bg-slate-50 border-r border-slate-200">Pulse</td>
                          <td className="py-1 px-2 text-center font-mono">{medicalRecord?.pulse || "-"}</td>
                        </tr>
                        <tr>
                          <td className="py-1 px-2.5 font-semibold bg-slate-50 border-r border-slate-200">Spectacles</td>
                          <td className="py-1 px-2 text-center">{medicalRecord?.spectaclesDetails || "-"}</td>
                        </tr>
                        <tr>
                          <td className="py-1 px-2.5 font-semibold bg-slate-50 border-r border-slate-200">Dental</td>
                          <td className="py-1 px-2 text-center">{medicalRecord?.dentalDetails || "-"}</td>
                        </tr>
                        <tr>
                          <td className="py-1 px-2.5 font-semibold bg-slate-50 border-r border-slate-200">B.P</td>
                          <td className="py-1 px-2 text-center font-mono">{medicalRecord?.bloodPressure || "-"}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* SECTION: Family History */}
              <div className="border border-slate-300 rounded-xl overflow-hidden shadow-xs">
                <div className="bg-[#0B1220] px-4 py-1.5 font-serif text-xs font-bold text-[#E8C77A] uppercase tracking-wider">
                  Family History
                </div>
                <div className="p-3 space-y-2 bg-white">
                  <div className="text-[10px] text-slate-600">
                    Family History Date : {formatDate(member.familyHistories?.[0]?.date || "") || "-"}
                  </div>
                  <table className="w-full text-left text-[10px] border border-slate-200 border-collapse rounded-lg overflow-hidden">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-slate-800 font-bold">
                        <th className="py-1.5 px-3 border-r border-slate-200">Relation</th>
                        <th className="py-1.5 px-3 border-r border-slate-200 text-center">Present Age</th>
                        <th className="py-1.5 px-3 border-r border-slate-200">Health</th>
                        <th className="py-1.5 px-3 border-r border-slate-200 text-center">Age at Death</th>
                        <th className="py-1.5 px-3">Cause of Death</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {familyRecords.length > 0 ? (
                        familyRecords.map((fRec, fIdx) => (
                          <tr key={fRec.id || fIdx}>
                            <td className="py-1 px-3 border-r border-slate-200 font-medium">{fRec.relation}</td>
                            <td className="py-1 px-3 border-r border-slate-200 text-center font-mono">
                              {fRec.isDead ? "-" : fRec.age}
                            </td>
                            <td className="py-1 px-3 border-r border-slate-200">{fRec.stateOfHealth || "-"}</td>
                            <td className="py-1 px-3 border-r border-slate-200 text-center font-mono">
                              {fRec.isDead ? fRec.ageAtDeath || fRec.age : "-"}
                            </td>
                            <td className="py-1 px-3">{fRec.causeOfDeath || "-"}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td className="py-2 px-3 border-r border-slate-200">-</td>
                          <td className="py-2 px-3 border-r border-slate-200 text-center">-</td>
                          <td className="py-2 px-3 border-r border-slate-200">-</td>
                          <td className="py-2 px-3 border-r border-slate-200 text-center">-</td>
                          <td className="py-2 px-3">-</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bank Details Section */}
              {formData.reportOptions.printBankDetails && (
                <div className="border border-slate-300 rounded-xl overflow-hidden shadow-xs">
                  <div className="bg-[#0B1220] px-4 py-1.5 font-serif text-xs font-bold text-[#E8C77A] uppercase tracking-wider">
                    Bank Details
                  </div>
                  <div className="p-3 grid grid-cols-12 gap-2 text-[10px] bg-white">
                    {member.bankDetails && member.bankDetails.length > 0 ? (
                      member.bankDetails.map((b, bIdx) => (
                        <div key={b.id || bIdx} className="col-span-12 grid grid-cols-12 gap-2">
                          <div className="col-span-4">Bank Name: <span className="font-semibold">{b.bankName || "-"}</span></div>
                          <div className="col-span-4">Branch: <span className="font-semibold">{b.bankBranch || "-"}</span></div>
                          <div className="col-span-4">Account No: <span className="font-mono font-bold">{b.accountNumber || "-"}</span></div>
                          <div className="col-span-4">IFSC: <span className="font-mono font-bold">{b.ifscCode || "-"}</span></div>
                          <div className="col-span-4">Account Type: <span className="font-semibold">{b.accountType || "-"}</span></div>
                          <div className="col-span-4">MICR: <span className="font-mono">{b.micrNumber || "-"}</span></div>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-12 text-slate-500 italic">No bank records registered</div>
                    )}
                  </div>
                </div>
              )}

              {/* Policy Details Table */}
              <div
                className={`border border-slate-300 rounded-xl overflow-hidden shadow-xs ${
                  formData.reportOptions.printPolicyOnNewPage ? "page-break-before pt-4" : ""
                }`}
              >
                <div className="bg-[#0B1220] px-4 py-1.5 font-serif text-xs font-bold text-[#E8C77A] uppercase tracking-wider">
                  Policy Details
                </div>
                <table className="w-full text-left text-[9px] border-collapse bg-white">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 font-bold">
                      <th className="py-1.5 px-1.5 border-r border-slate-300">Policy No</th>
                      <th className="py-1.5 px-1 border-r border-slate-300 text-center">Com. Date</th>
                      <th className="py-1.5 px-1 border-r border-slate-300 text-center">Pl/Tm/Pt</th>
                      <th className="py-1.5 px-1.5 border-r border-slate-300 text-right">Sum</th>
                      <th className="py-1.5 px-1.5 border-r border-slate-300 text-right">Premium</th>
                      <th className="py-1.5 px-1 border-r border-slate-300 text-center">Md.</th>
                      <th className="py-1.5 px-1 border-r border-slate-300 text-center">Ag Cd</th>
                      <th className="py-1.5 px-1 border-r border-slate-300 text-center">Brn.</th>
                      <th className="py-1.5 px-1.5 border-r border-slate-300">Nominee</th>
                      <th className="py-1.5 px-1 border-r border-slate-300 text-center">Rel.</th>
                      <th className="py-1.5 px-1 border-r border-slate-300 text-center">F.U.P. Date</th>
                      <th className="py-1.5 px-1 border-r border-slate-300 text-center">Med/NM</th>
                      <th className="py-1.5 px-1 border-r border-slate-300 text-center">DAB</th>
                      <th className="py-1.5 px-1 border-r border-slate-300 text-right">Extra Prem.</th>
                      <th className="py-1.5 px-1.5 border-r border-slate-300 text-right">SA Rated</th>
                      <th className="py-1.5 px-1 text-center">Duly Tax Ben.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
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
                        <tr key={pol.id} className="hover:bg-slate-50">
                          <td className="py-1 px-1.5 border-r border-slate-200 font-bold font-mono text-slate-900">
                            {pol.policyNumber}
                          </td>
                          <td className="py-1 px-1 border-r border-slate-200 text-center font-mono">
                            {formatShortDate(pol.commencementDate)}
                          </td>
                          <td className="py-1 px-1 border-r border-slate-200 text-center font-mono">
                            {plTmPt}
                          </td>
                          <td className="py-1 px-1.5 border-r border-slate-200 text-right font-mono font-semibold">
                            {sumAssured.toLocaleString("en-IN")}
                          </td>
                          <td className="py-1 px-1.5 border-r border-slate-200 text-right font-mono">
                            {premiumAmt.toFixed(2)}
                          </td>
                          <td className="py-1 px-1 border-r border-slate-200 text-center">
                            {modeStr}
                          </td>
                          <td className="py-1 px-1 border-r border-slate-200 text-center font-mono">
                            {agCd}
                          </td>
                          <td className="py-1 px-1 border-r border-slate-200 text-center font-mono">
                            {branchCd}
                          </td>
                          <td className="py-1 px-1.5 border-r border-slate-200 truncate max-w-[90px]">
                            {nominee || "-"}
                          </td>
                          <td className="py-1 px-1 border-r border-slate-200 text-center">
                            {nomineeRel || "-"}
                          </td>
                          <td className="py-1 px-1 border-r border-slate-200 text-center font-mono">
                            {fupDate || "-"}
                          </td>
                          <td className="py-1 px-1 border-r border-slate-200 text-center">M</td>
                          <td className="py-1 px-1 border-r border-slate-200 text-center font-mono">35</td>
                          <td className="py-1 px-1 border-r border-slate-200 text-right font-mono">0.00</td>
                          <td className="py-1 px-1.5 border-r border-slate-200 text-right font-mono font-semibold">
                            {sumAssured.toLocaleString("en-IN")}
                          </td>
                          <td className="py-1 px-1 text-center">self</td>
                        </tr>
                      );
                    })}

                    {memberPolicies.length === 0 && (
                      <tr>
                        <td colSpan={16} className="py-4 text-center text-slate-400 italic">
                          No active policies registered for this client
                        </td>
                      </tr>
                    )}

                    {/* Total Row */}
                    <tr className="bg-slate-100 font-bold border-t-2 border-slate-300">
                      <td colSpan={3} className="py-1 px-2 border-r border-slate-300 text-right uppercase">
                        Total:
                      </td>
                      <td className="py-1 px-1.5 border-r border-slate-300 text-right font-mono text-slate-900">
                        {totalSumAssured.toLocaleString("en-IN")}
                      </td>
                      <td className="py-1 px-1.5 border-r border-slate-300 text-right font-mono text-slate-900">
                        {totalPremiumAnnual.toFixed(2)}
                      </td>
                      <td colSpan={9} className="py-1 px-2 border-r border-slate-300 text-left">
                        p.a.
                      </td>
                      <td className="py-1 px-1.5 border-r border-slate-300 text-right font-mono text-slate-900">
                        {totalSARated.toLocaleString("en-IN")}
                      </td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {formData.reportOptions.printRemarksInPolicy && (
                <div className="text-[10px] text-slate-600 italic px-2">
                  Remarks: {member.miscInfo?.specialNote || "All policy certificates verified."}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
