"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { RootState, AppDispatch } from "@/store/store";
import { fetchClaimById } from "@/features/claim/claimSlice";
import { useRouter, useParams, useSearchParams } from "next/navigation";

import Link from "next/link";
import {
  ChevronRight,
  AlertCircle,
  User,
  FileText,
  IndianRupee,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Download,
} from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  CustomerSectionCard,
  CustomerBreadcrumbs,
} from "@/features/customers/components/CustomerUi";

export default function ViewClaimPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const dispatch = useDispatch<AppDispatch>();
  const user = useAuth();
  const searchParams = useSearchParams();
  const index = searchParams.get("index");

  const { selectedClaim, isLoading, error } = useSelector(
    (state: RootState) => state.claims,
  );

  useEffect(() => {
    if (id) {
      dispatch(fetchClaimById(id as string));
    }
  }, [dispatch, id]);

  const customerFullName = `${selectedClaim?.policy.CustomerMaster?.salutation}
                              ${selectedClaim?.policy.CustomerMaster?.firstName} 
                              ${selectedClaim?.policy.CustomerMaster?.lastName}`;

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { color: string; icon: any }> = {
      Approved: { color: "bg-green-100 text-green-700", icon: CheckCircle },
      Rejected: { color: "bg-red-100 text-red-700", icon: XCircle },
      "In Progress": { color: "bg-blue-100 text-blue-700", icon: Clock },
      Pending: { color: "bg-yellow-100 text-yellow-700", icon: Clock },
    };
    const StatusIcon = statusMap[status]?.icon || AlertCircle;
    return {
      className: statusMap[status]?.color || "bg-slate-100 text-slate-700",
      icon: StatusIcon,
    };
  };

  if (isLoading || !selectedClaim) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-sm text-slate-500">Loading claim...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
          <div>
            <p className="text-red-800 font-medium">Unable to load claim</p>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const statusBadge = getStatusBadge(selectedClaim?.status || "");

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <CustomerBreadcrumbs
        items={[
          { label: "Claims", href: "/dashboard/claims" },
          { label: "Claim Details" },
        ]}
      />

      <div>
        <h1 className="mt-2 font-serif text-2xl font-semibold tracking-tight sm:text-[28px] text-slate-900">
          Claim Details
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          View complete claim information.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Claim Information */}
        <div className="lg:col-span-2 space-y-6">
          <CustomerSectionCard title="Claim Information" icon={FileText}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 mb-1">
                  Claim Number
                </p>
                <p className="font-semibold text-slate-900">{index}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 mb-1">
                  Claim Date
                </p>
                <p className="font-semibold text-slate-900">
                  {new Date(
                    selectedClaim?.claimDate || "",
                  ).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 mb-1">
                  Policy Number
                </p>
                <p className="font-semibold text-slate-900">
                  {selectedClaim?.policy?.policyNumber}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 mb-1">
                  Customer Name
                </p>
                <p className="font-semibold text-slate-900">
                  {customerFullName}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 mb-1">
                  Claim Type
                </p>
                <p className="font-semibold text-slate-900">
                  {selectedClaim?.claimType}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 mb-1">
                  Claimed Amount
                </p>
                <p className="font-semibold text-slate-900">
                  ₹ {selectedClaim?.claimAmount.toLocaleString("en-IN")}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 mb-1">
                  Claimant Name
                </p>
                <p className="font-semibold text-slate-900">
                  {selectedClaim?.claimantName || "-"}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 mb-1">
                  Reason for Claim
                </p>
                <p className="font-semibold text-slate-900">
                  {selectedClaim?.reasonForClaim || "—"}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 mb-1">
                  Claim Status
                </p>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadge.className}`}
                >
                  <statusBadge.icon size={13} />
                  {selectedClaim?.status}
                </span>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 mb-1">
                  Created By
                </p>
                <p className="font-semibold text-slate-900">{`${user.user?.name} (${user.user?.role})`}</p>
              </div>
            </div>
          </CustomerSectionCard>

          {/* ── Payment Details Card ──────────────────── */}
          {selectedClaim?.paymentType && (
            <CustomerSectionCard title="Payment Details" icon={FileText}>
              {selectedClaim.paymentType === "NEFT" && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Payment Type
                    </p>
                    <p className="font-semibold text-slate-900 text-sm">NEFT</p>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Account Holder Name
                    </p>
                    <p className="font-semibold text-slate-900 text-sm">
                      {selectedClaim.accountHolderName || "-"}
                    </p>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Bank Name
                    </p>
                    <p className="font-semibold text-slate-900 text-sm">
                      {selectedClaim.bankName || "-"}
                    </p>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Account Number
                    </p>
                    <p className="font-semibold text-slate-900 text-sm">
                      {selectedClaim.accountNumber || "-"}
                    </p>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      IFSC Code
                    </p>
                    <p className="font-semibold text-slate-900 text-sm">
                      {selectedClaim.ifscCode || "-"}
                    </p>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Branch Name
                    </p>
                    <p className="font-semibold text-slate-900 text-sm">
                      {selectedClaim.branchName || "-"}
                    </p>
                  </div>
                </div>
              )}
              {selectedClaim.paymentType === "Cheque" && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Payment Type
                    </p>
                    <p className="font-semibold text-slate-900 text-sm">
                      Cheque
                    </p>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Cheque Number
                    </p>
                    <p className="font-semibold text-slate-900 text-sm">
                      {selectedClaim.chequeNumber || "-"}
                    </p>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Cheque Date
                    </p>
                    <p className="font-semibold text-slate-900 text-sm">
                      {selectedClaim.chequeDate
                        ? new Date(
                            selectedClaim.chequeDate,
                          ).toLocaleDateString()
                        : "-"}
                    </p>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Bank Name
                    </p>
                    <p className="font-semibold text-slate-900 text-sm">
                      {selectedClaim.bankName || "-"}
                    </p>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Branch Name
                    </p>
                    <p className="font-semibold text-slate-900 text-sm">
                      {selectedClaim.branchName || "-"}
                    </p>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Cheque Amount
                    </p>
                    <p className="font-semibold text-slate-900 text-sm">
                      {selectedClaim.chequeAmount
                        ? `₹ ${selectedClaim.chequeAmount.toLocaleString("en-IN")}`
                        : "-"}
                    </p>
                  </div>
                </div>
              )}
            </CustomerSectionCard>
          )}

          {/* ── Nominee Card ───────────────────────────── */}
          {selectedClaim?.nominee && (
            <CustomerSectionCard title="Nominee Information" icon={User}>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Nominee Name
                  </p>
                  <p className="font-semibold text-slate-900 text-sm">
                    {selectedClaim.nominee.nomineeName}
                  </p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Relationship
                  </p>
                  <p className="font-semibold text-slate-900 text-sm">
                    {selectedClaim.nominee.relationship || "-"}
                  </p>
                </div>
              </div>
            </CustomerSectionCard>
          )}
        </div>

        {/* Right Column - Policy Information */}
        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <CustomerSectionCard title="Policy Information" icon={FileText}>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Policy Name
                  </p>
                  <p className="font-semibold text-slate-900 text-sm">
                    {selectedClaim?.policy?.product?.productName}
                  </p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Policy Status
                  </p>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                      selectedClaim?.policy?.status?.statusName === "Active"
                        ? "bg-green-100 text-green-700"
                        : selectedClaim?.policy?.status?.statusName === "Lapsed"
                          ? "bg-red-100 text-red-700"
                          : selectedClaim?.policy?.status?.statusName ===
                              "Pending"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {selectedClaim?.policy?.status?.statusName}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Sum Assured
                  </p>
                  <p className="font-semibold text-slate-900 text-sm">
                    ₹{" "}
                    {selectedClaim?.policy?.premium?.sumAssured.toLocaleString(
                      "en-IN",
                    )}
                  </p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Policy Start Date
                  </p>
                  <p className="font-semibold text-slate-900 text-sm">
                    {new Date(
                      selectedClaim?.policy?.commencementDate || "",
                    ).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Policy End Date
                  </p>
                  <p className="font-semibold text-slate-900 text-sm">
                    {new Date(
                      selectedClaim?.policy?.maturityDate || "",
                    ).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Premium Paying Term
                  </p>
                  <p className="font-semibold text-slate-900 text-sm">
                    {selectedClaim?.policy?.premiumPayingTerm || "-"}
                  </p>
                </div>
              </div>
            </CustomerSectionCard>

            {/* ── Claim Documents Card ────────────────────── */}
            <CustomerSectionCard title="Claim Documents" icon={FileText}>
              {selectedClaim?.documents &&
              selectedClaim.documents.length > 0 ? (
                <div className="space-y-3">
                  {selectedClaim.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-lg border border-slate-200 group"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <FileText
                          size={18}
                          className="text-slate-400 flex-shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {doc.originalName}
                          </p>
                          <p className="text-xs text-slate-500">
                            {(doc.fileSize ? doc.fileSize / 1024 : 0).toFixed(
                              2,
                            )}{" "}
                            KB •{" "}
                            {doc.createdAt
                              ? new Date(doc.createdAt).toLocaleDateString()
                              : "-"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          View
                        </a>
                        <a
                          href={doc.fileUrl}
                          download
                          className="px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          Download
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <FileText size={32} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-sm text-slate-500">
                    No documents uploaded for this claim yet
                  </p>
                </div>
              )}
            </CustomerSectionCard>
          </div>
        </div>
      </div>
    </div>
  );
}
