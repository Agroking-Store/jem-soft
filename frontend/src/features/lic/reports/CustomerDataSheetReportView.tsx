"use client";

import { useRef, useState, useMemo } from "react";
import { ArrowLeft, Download, Printer } from "lucide-react";
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

    // If specific members or groups are selected
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

      let filteredMembers = customersMaster.filter((cm) => {
        if (memberIds.has(cm.id)) return true;
        if (cm.groupId && groupIds.has(cm.groupId)) return true;
        return false;
      });

      if (filteredMembers.length > 0) {
        return filteredMembers;
      }

      // If no CustomerMaster matched, fallback to customers
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

    // Default: If no filters selected, show all available members (or first few)
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

  // Handle PDF Export
  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    const toastId = toast.loading("Generating PDF Document...");

    try {
      const element = reportRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      pdf.save(`Customer_Data_Sheet_${new Date().toISOString().split("T")[0]}.pdf`);
      toast.success("PDF Downloaded successfully", { id: toastId });
    } catch (error) {
      console.error("PDF generation failed:", error);
      toast.error("Failed to generate PDF", { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Toolbar (Hidden on Print) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs print:hidden">
        <button
          type="button"
          onClick={onBackToForm}
          className="flex items-center gap-2 text-xs font-semibold text-slate-700 hover:text-blue-600 transition"
        >
          <ArrowLeft size={16} />
          <span>Back to Filter Form</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <Printer size={15} />
            <span>Print Sheet</span>
          </button>
          <button
            type="button"
            disabled={isExporting}
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-[#02569B] to-[#014175] text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:brightness-110 transition shadow-md disabled:opacity-50"
          >
            <Download size={15} />
            <span>{isExporting ? "Exporting..." : "Download PDF"}</span>
          </button>
        </div>
      </div>

      {/* Main Report Container */}
      <div
        ref={reportRef}
        className="bg-white p-4 sm:p-8 rounded-2xl border border-slate-200 shadow-lg text-slate-900 print:border-none print:shadow-none print:p-0 space-y-12"
      >
        {targetMembers.map((member, mIdx) => {
          // Resolve group details
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

          // Totals calculation
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
                mIdx > 0 ? "pt-8 border-t-2 border-dashed border-slate-300 page-break-before" : ""
              }`}
            >
              {/* Top Agency Header matching sample PDF */}
              <div className="flex flex-col items-center justify-center text-center space-y-0.5 pb-2">
                <h2 className="text-base font-bold text-[#2E1A47] tracking-tight">
                  Jayant Yashwantrao Mahabole
                </h2>
                <div className="text-xs font-semibold text-[#B22222]">
                  MBA in Insurance & Finance
                </div>
                <div className="text-[10px] text-slate-700">
                  84/2, Darpan Bldg,. 201 Sarang Society, Sahakarnagar No. 2 Parvati Pune 411009,
                </div>
                <div className="text-[10px] text-slate-700">
                  9822452896, office@jayantmahbole.com,
                </div>
              </div>

              {/* Title Banner in Pink/Rose Box with Black Border */}
              <div className="border border-black bg-[#FDE8E8] px-4 py-1.5 text-center">
                <h1 className="text-sm font-bold text-black uppercase tracking-wide">
                  Data Sheet of {memberFullName || "Client"}
                </h1>
              </div>

              {/* Date */}
              <div className="text-right text-[11px] font-medium text-slate-900 pr-2">
                Date : {formatDate(formData.reportDate)}
              </div>

              {/* Group Code / Personal Code / Group Head Row */}
              <div className="border border-black divide-y divide-black">
                <div className="grid grid-cols-12 px-3 py-1 bg-slate-50/50 font-medium">
                  <div className="col-span-4">
                    Group Code : <span className="font-bold">{groupCode}</span>
                  </div>
                  <div className="col-span-3">
                    Personal Code : <span className="font-bold">{mIdx + 1}</span>
                  </div>
                  <div className="col-span-5">
                    Group Head : <span className="font-bold">{groupHeadName}</span>
                  </div>
                </div>

                <div className="grid grid-cols-12 divide-x divide-black">
                  <div className="col-span-6 p-2 space-y-1">
                    <div className="font-semibold text-slate-700">Resident Address</div>
                    <div className="text-slate-900 min-h-[32px]">{resAddressStr || "-"}</div>
                  </div>
                  <div className="col-span-6 p-2 space-y-1">
                    <div className="font-semibold text-slate-700">Office Address</div>
                    <div className="text-slate-900 min-h-[32px]">{offAddressStr || "-"}</div>
                  </div>
                </div>

                <div className="grid grid-cols-12 divide-x divide-black p-2 gap-y-1">
                  <div className="col-span-6 pr-2 space-y-1">
                    <div>Tel No.(R) : {telRes || "-"}</div>
                    <div>Fax No. : {fax || "-"}</div>
                    <div>Mobile : {mobile || "-"}</div>
                  </div>
                  <div className="col-span-6 pl-2 space-y-1">
                    <div>Tel No. (O) : {telOff || "-"}</div>
                    <div>E-mail : {email || "-"}</div>
                    <div>Location : {resAddress?.city || (group as any)?.resCity || "Pune"}</div>
                  </div>
                </div>
              </div>

              {/* SECTION: Personal Information */}
              <div className="border border-black">
                <div className="bg-slate-100 px-3 py-1 font-bold text-slate-900 border-b border-black uppercase text-[11px]">
                  Personal Information
                </div>
                <div className="p-2.5 grid grid-cols-12 gap-x-4 gap-y-1.5">
                  <div className="col-span-5">
                    Birth Date (Rec) : {formatDate(member.dob || "") || "-"}
                  </div>
                  <div className="col-span-4">
                    Birth Date (Greeting) : {formatDate(misc?.dobForGreetings || member.dob || "") || "-"}
                  </div>
                  <div className="col-span-3">
                    Birth Place : -
                  </div>

                  <div className="col-span-5">Age Proof : -</div>
                  <div className="col-span-4">Nationality : {misc?.nationality || "Indian"}</div>
                  <div className="col-span-3">PAN : {member.panNumber || "-"}</div>

                  <div className="col-span-5">Father&apos;s Name : {misc?.fatherName || "-"}</div>
                  <div className="col-span-4">Mother&apos;s Name : {misc?.motherName || "-"}</div>
                  <div className="col-span-3">Marriage Date : {formatDate(misc?.marriageDate || "") || "-"}</div>

                  <div className="col-span-5">Spouse Name : {misc?.spouseName || "-"}</div>
                  <div className="col-span-7">AadhaarCard No : {member.aadhaarNumber || "-"}</div>

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
              <div className="border border-black">
                <div className="bg-slate-100 px-3 py-1 font-bold text-slate-900 border-b border-black uppercase text-[11px]">
                  Medical Detail
                </div>
                <div className="grid grid-cols-12 divide-x divide-black">
                  {/* Left Examination Details */}
                  <div className="col-span-8 p-2.5 space-y-1.5">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        Medical Date : {formatDate(medicalRecord?.medicalExaminationDate || "") || "-"}
                      </div>
                      <div>
                        Medical History Date : {formatDate(medicalRecord?.medicalHistoryDate || "") || "-"}
                      </div>
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
                      <tbody className="divide-y divide-black">
                        <tr>
                          <td className="py-1 px-2 font-semibold bg-slate-50 border-r border-black w-1/2">
                            Height
                          </td>
                          <td className="py-1 px-2 text-center">{medicalRecord?.height || "-"}</td>
                        </tr>
                        <tr>
                          <td className="py-1 px-2 font-semibold bg-slate-50 border-r border-black">
                            Weight
                          </td>
                          <td className="py-1 px-2 text-center">{medicalRecord?.weight || "-"}</td>
                        </tr>
                        <tr>
                          <td className="py-1 px-2 font-semibold bg-slate-50 border-r border-black">
                            Chest
                          </td>
                          <td className="py-1 px-2 text-center">{medicalRecord?.chest || "-"}</td>
                        </tr>
                        <tr>
                          <td className="py-1 px-2 font-semibold bg-slate-50 border-r border-black">
                            Abdomen
                          </td>
                          <td className="py-1 px-2 text-center">{medicalRecord?.abdomen || "-"}</td>
                        </tr>
                        <tr>
                          <td className="py-1 px-2 font-semibold bg-slate-50 border-r border-black">
                            Blood Group
                          </td>
                          <td className="py-1 px-2 text-center">{medicalRecord?.bloodGroup || "-"}</td>
                        </tr>
                        <tr>
                          <td className="py-1 px-2 font-semibold bg-slate-50 border-r border-black">
                            Pulse
                          </td>
                          <td className="py-1 px-2 text-center">{medicalRecord?.pulse || "-"}</td>
                        </tr>
                        <tr>
                          <td className="py-1 px-2 font-semibold bg-slate-50 border-r border-black">
                            Spectacles
                          </td>
                          <td className="py-1 px-2 text-center">{medicalRecord?.spectaclesDetails || "-"}</td>
                        </tr>
                        <tr>
                          <td className="py-1 px-2 font-semibold bg-slate-50 border-r border-black">
                            Dental
                          </td>
                          <td className="py-1 px-2 text-center">{medicalRecord?.dentalDetails || "-"}</td>
                        </tr>
                        <tr>
                          <td className="py-1 px-2 font-semibold bg-slate-50 border-r border-black">
                            B.P
                          </td>
                          <td className="py-1 px-2 text-center">{medicalRecord?.bloodPressure || "-"}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* SECTION: Family History */}
              <div className="border border-black">
                <div className="bg-slate-100 px-3 py-1 font-bold text-slate-900 border-b border-black uppercase text-[11px]">
                  Family History
                </div>
                <div className="p-2 space-y-1">
                  <div className="text-[10px] text-slate-600 mb-1">
                    Family History Date : {formatDate(member.familyHistories?.[0]?.date || "") || "-"}
                  </div>
                  <table className="w-full text-left text-[10px] border border-black border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-black text-slate-900 font-semibold">
                        <th className="py-1 px-2 border-r border-black">Relation</th>
                        <th className="py-1 px-2 border-r border-black text-center">Present Age</th>
                        <th className="py-1 px-2 border-r border-black">Health</th>
                        <th className="py-1 px-2 border-r border-black text-center">Age at Death</th>
                        <th className="py-1 px-2">Cause of Death</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black">
                      {familyRecords.length > 0 ? (
                        familyRecords.map((fRec, fIdx) => (
                          <tr key={fRec.id || fIdx}>
                            <td className="py-1 px-2 border-r border-black">{fRec.relation}</td>
                            <td className="py-1 px-2 border-r border-black text-center">
                              {fRec.isDead ? "-" : fRec.age}
                            </td>
                            <td className="py-1 px-2 border-r border-black">{fRec.stateOfHealth || "-"}</td>
                            <td className="py-1 px-2 border-r border-black text-center">
                              {fRec.isDead ? fRec.ageAtDeath || fRec.age : "-"}
                            </td>
                            <td className="py-1 px-2">{fRec.causeOfDeath || "-"}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td className="py-1.5 px-2 border-r border-black">-</td>
                          <td className="py-1.5 px-2 border-r border-black text-center">-</td>
                          <td className="py-1.5 px-2 border-r border-black">-</td>
                          <td className="py-1.5 px-2 border-r border-black text-center">-</td>
                          <td className="py-1.5 px-2">-</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bank Details Section (Rendered when checkbox is selected) */}
              {formData.reportOptions.printBankDetails && (
                <div className="border border-black">
                  <div className="bg-slate-100 px-3 py-1 font-bold text-slate-900 border-b border-black uppercase text-[11px]">
                    Bank Details
                  </div>
                  <div className="p-2.5 grid grid-cols-12 gap-2 text-[10px]">
                    {member.bankDetails && member.bankDetails.length > 0 ? (
                      member.bankDetails.map((b, bIdx) => (
                        <div key={b.id || bIdx} className="col-span-12 grid grid-cols-12 gap-2">
                          <div className="col-span-4">Bank Name: <span className="font-semibold">{b.bankName || "-"}</span></div>
                          <div className="col-span-4">Branch: <span className="font-semibold">{b.bankBranch || "-"}</span></div>
                          <div className="col-span-4">Account No: <span className="font-semibold">{b.accountNumber || "-"}</span></div>
                          <div className="col-span-4">IFSC: <span className="font-semibold">{b.ifscCode || "-"}</span></div>
                          <div className="col-span-4">Account Type: <span className="font-semibold">{b.accountType || "-"}</span></div>
                          <div className="col-span-4">MICR: <span className="font-semibold">{b.micrNumber || "-"}</span></div>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-12 text-slate-500 italic">No bank records provided</div>
                    )}
                  </div>
                </div>
              )}

              {/* SECTION: Policy Details Table matching sample PDF */}
              <div
                className={`border border-black ${
                  formData.reportOptions.printPolicyOnNewPage ? "page-break-before pt-4" : ""
                }`}
              >
                <table className="w-full text-left text-[9px] border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-black text-slate-900 font-bold">
                      <th className="py-1 px-1.5 border-r border-black">Policy No</th>
                      <th className="py-1 px-1 border-r border-black text-center">Com. Date</th>
                      <th className="py-1 px-1 border-r border-black text-center">Pl/Tm/Pt</th>
                      <th className="py-1 px-1.5 border-r border-black text-right">Sum</th>
                      <th className="py-1 px-1.5 border-r border-black text-right">Premium</th>
                      <th className="py-1 px-1 border-r border-black text-center">Md.</th>
                      <th className="py-1 px-1 border-r border-black text-center">Ag Cd</th>
                      <th className="py-1 px-1 border-r border-black text-center">Brn.</th>
                      <th className="py-1 px-1.5 border-r border-black">Nominee</th>
                      <th className="py-1 px-1 border-r border-black text-center">Rel.</th>
                      <th className="py-1 px-1 border-r border-black text-center">F.U.P. Date</th>
                      <th className="py-1 px-1 border-r border-black text-center">Med/NM</th>
                      <th className="py-1 px-1 border-r border-black text-center">DAB</th>
                      <th className="py-1 px-1 border-r border-black text-right">Extra Prem.</th>
                      <th className="py-1 px-1.5 border-r border-black text-right">SA Rated</th>
                      <th className="py-1 px-1 text-center">Duly Tax Ben.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black">
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
                          <td className="py-1 px-1.5 border-r border-black font-semibold">
                            {pol.policyNumber}
                          </td>
                          <td className="py-1 px-1 border-r border-black text-center">
                            {formatShortDate(pol.commencementDate)}
                          </td>
                          <td className="py-1 px-1 border-r border-black text-center">
                            {plTmPt}
                          </td>
                          <td className="py-1 px-1.5 border-r border-black text-right font-mono">
                            {sumAssured.toLocaleString("en-IN")}
                          </td>
                          <td className="py-1 px-1.5 border-r border-black text-right font-mono">
                            {premiumAmt.toFixed(2)}
                          </td>
                          <td className="py-1 px-1 border-r border-black text-center">
                            {modeStr}
                          </td>
                          <td className="py-1 px-1 border-r border-black text-center font-mono">
                            {agCd}
                          </td>
                          <td className="py-1 px-1 border-r border-black text-center font-mono">
                            {branchCd}
                          </td>
                          <td className="py-1 px-1.5 border-r border-black truncate max-w-[90px]">
                            {nominee || "-"}
                          </td>
                          <td className="py-1 px-1 border-r border-black text-center">
                            {nomineeRel || "-"}
                          </td>
                          <td className="py-1 px-1 border-r border-black text-center">
                            {fupDate || "-"}
                          </td>
                          <td className="py-1 px-1 border-r border-black text-center">M</td>
                          <td className="py-1 px-1 border-r border-black text-center font-mono">35</td>
                          <td className="py-1 px-1 border-r border-black text-right font-mono">0.00</td>
                          <td className="py-1 px-1.5 border-r border-black text-right font-mono">
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
                    <tr className="bg-slate-100 font-bold border-t border-black">
                      <td colSpan={3} className="py-1 px-2 border-r border-black text-right">
                        Total:
                      </td>
                      <td className="py-1 px-1.5 border-r border-black text-right font-mono">
                        {totalSumAssured.toLocaleString("en-IN")}
                      </td>
                      <td className="py-1 px-1.5 border-r border-black text-right font-mono">
                        {totalPremiumAnnual.toFixed(2)}
                      </td>
                      <td colSpan={9} className="py-1 px-2 border-r border-black text-left">
                        p.a.
                      </td>
                      <td className="py-1 px-1.5 border-r border-black text-right font-mono">
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
