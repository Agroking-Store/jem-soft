"use client";

import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { RootState, AppDispatch } from "@/store/store";
import {
  fetchClaimById,
  clearSelectedClaim,
} from "@/features/claim/claimSlice";
import { useRouter, useParams } from "next/navigation";
import {
  AlertCircle,
  User,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  SquarePen,
} from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  CustomerSectionCard,
  CustomerBreadcrumbs,
} from "@/features/customers/components/CustomerUi";

const STATUS_MAP: Record<string, { color: string; icon: any }> = {
  Approved: { color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle },
  Settled: { color: "bg-blue-50 text-[#1877F2] border-blue-200", icon: CheckCircle },
  Rejected: { color: "bg-rose-50 text-rose-700 border-rose-200", icon: XCircle },
  "In Progress": { color: "bg-blue-50 text-blue-700 border-blue-200", icon: Clock },
  Pending: { color: "bg-amber-50 text-amber-700 border-amber-200", icon: Clock },
};

export default function ViewClaimPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useAuth();

  const { selectedClaim, isLoading, error } = useSelector(
    (state: RootState) => state.claims,
  );

  const canEdit = user?.role === "ADMIN" || user?.role === "ADVISOR";

  useEffect(() => {
    if (id) dispatch(fetchClaimById(id));
    return () => {
      dispatch(clearSelectedClaim());
    };
  }, [dispatch, id]);

  if (isLoading || !selectedClaim) {
    return (
      <div className="max-w-7xl mx-auto text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1877F2] mx-auto" />
        <p className="mt-4 text-sm text-slate-500">Loading claim...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 flex items-center gap-3">
          <AlertCircle className="text-rose-600" size={20} />
          <div>
            <p className="text-rose-800 font-semibold">Unable to load claim</p>
            <p className="text-rose-600 text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const cm = selectedClaim.policy?.CustomerMaster;
  const customerFullName = cm
    ? [cm.salutation, cm.firstName, cm.middleName, cm.lastName]
        .filter(Boolean)
        .join(" ")
    : "—";

  const badge = STATUS_MAP[selectedClaim.status] || {
    color: "bg-slate-50 text-slate-700 border-slate-200",
    icon: AlertCircle,
  };
  const StatusIcon = badge.icon;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-8">
      <CustomerBreadcrumbs
        items={[
          { label: "Claims", href: "/dashboard/claims" },
          { label: "Claim Details" },
        ]}
      />

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">
            Claim Details
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-500">
            View complete claim information.
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() =>
              router.push(`/dashboard/claims/edit/${selectedClaim.id}`)
            }
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#5c67ff] to-[#3a47ff] px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-200 transition-all hover:brightness-110 active:scale-[0.98]"
          >
            <SquarePen size={16} /> Edit Claim
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT */}
        <div className="lg:col-span-2 space-y-6">
          <CustomerSectionCard title="Claim Information" icon={FileText}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field
                label="Policy Number"
                value={selectedClaim.policy?.policyNumber}
                mono
              />
              <Field
                label="Claim Date"
                value={new Date(selectedClaim.claimDate).toLocaleDateString(
                  "en-IN",
                )}
              />
              <Field label="Customer Name" value={customerFullName} />
              <Field
                label="Claimant Name"
                value={selectedClaim.claimantName || "—"}
              />
              <Field label="Claim Type" value={selectedClaim.claimType} />
              <Field
                label="Claim Amount"
                value={`₹${Number(selectedClaim.claimAmount).toLocaleString("en-IN")}`}
                highlight
              />
              <div className="flex flex-col rounded-xl border border-[#F1F3F6] bg-[#F8F9FB] p-3.5 transition-all duration-200 hover:border-blue-100 hover:bg-white hover:shadow-sm">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8E99AF] mb-1">
                  Status
                </span>
                <div>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${badge.color}`}
                  >
                    <StatusIcon size={12} /> {selectedClaim.status}
                  </span>
                </div>
              </div>
              <div className="md:col-span-2">
                <Field
                  label="Reason for Claim"
                  value={selectedClaim.reasonForClaim || "—"}
                />
              </div>
            </div>
          </CustomerSectionCard>

          {/* Payment Details */}
          {selectedClaim.paymentType && (
            <CustomerSectionCard title="Payment Details" icon={FileText}>
              <div className="space-y-3">
                <PayRow
                  label="Payment Type"
                  value={selectedClaim.paymentType}
                />

                {selectedClaim.paymentType === "NEFT" && (
                  <>
                    <PayRow
                      label="Account Holder Name"
                      value={selectedClaim.accountHolderName}
                    />
                    <PayRow label="Bank Name" value={selectedClaim.bankName} />
                    <PayRow
                      label="Account Number"
                      value={selectedClaim.accountNumber}
                    />
                    <PayRow
                      label="IFSC Code"
                      value={selectedClaim.ifscCode}
                      mono
                    />
                    <PayRow
                      label="Branch Name"
                      value={selectedClaim.branchName}
                    />
                  </>
                )}

                {selectedClaim.paymentType === "Cheque" && (
                  <>
                    <PayRow
                      label="Cheque Number"
                      value={selectedClaim.chequeNumber}
                      mono
                    />
                    <PayRow
                      label="Cheque Date"
                      value={
                        selectedClaim.chequeDate
                          ? new Date(
                              selectedClaim.chequeDate,
                            ).toLocaleDateString("en-IN")
                          : "—"
                      }
                    />
                    <PayRow label="Bank Name" value={selectedClaim.bankName} />
                    <PayRow
                      label="Branch Name"
                      value={selectedClaim.branchName}
                    />
                    <PayRow
                      label="Cheque Amount"
                      value={
                        selectedClaim.chequeAmount
                          ? `₹${Number(selectedClaim.chequeAmount).toLocaleString("en-IN")}`
                          : "—"
                      }
                    />
                  </>
                )}
              </div>
            </CustomerSectionCard>
          )}

          {/* Nominee */}
          {selectedClaim.nominee && (
            <CustomerSectionCard title="Nominee Information" icon={User}>
              <div className="space-y-3">
                <PayRow
                  label="Nominee Name"
                  value={selectedClaim.nominee.nomineeName}
                />
                <PayRow
                  label="Relationship"
                  value={selectedClaim.nominee.relationship}
                />
              </div>
            </CustomerSectionCard>
          )}
        </div>

        {/* RIGHT */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 space-y-6">
            <CustomerSectionCard title="Policy Information" icon={FileText}>
              <div className="space-y-3">
                <PayRow
                  label="Policy Name"
                  value={selectedClaim.policy?.product?.productName}
                />
                <PayRow
                  label="Policy Status"
                  value={selectedClaim.policy?.status?.statusName}
                  badge={selectedClaim.policy?.status?.statusName}
                />
                <PayRow
                  label="Sum Assured"
                  value={`₹${Number(selectedClaim.policy?.premium?.sumAssured || 0).toLocaleString("en-IN")}`}
                />
                <PayRow
                  label="Start Date"
                  value={new Date(
                    selectedClaim.policy?.commencementDate || "",
                  ).toLocaleDateString("en-IN")}
                />
                {selectedClaim.policy?.maturityDate && (
                  <PayRow
                    label="Maturity Date"
                    value={new Date(
                      selectedClaim.policy.maturityDate,
                    ).toLocaleDateString("en-IN")}
                  />
                )}
                <PayRow
                  label="Premium Paying Term"
                  value={
                    selectedClaim.policy?.premiumPayingTerm
                      ? `${selectedClaim.policy.premiumPayingTerm} years`
                      : "—"
                  }
                />
              </div>
            </CustomerSectionCard>

            <CustomerSectionCard title="Claim Documents" icon={FileText}>
              {selectedClaim.documents && selectedClaim.documents.length > 0 ? (
                <div className="space-y-2">
                  {selectedClaim.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between px-3.5 py-3 bg-slate-50/70 rounded-xl border border-slate-200 group hover:bg-blue-50/40 hover:border-blue-200 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <FileText size={16} className="text-slate-400 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-800 truncate">
                            {doc.originalName}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {((doc.fileSize || 0) / 1024).toFixed(2)} KB •{" "}
                            {new Date(doc.createdAt).toLocaleDateString(
                              "en-IN",
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 text-xs font-semibold text-[#1877F2] hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          View
                        </a>
                        <a
                          href={doc.fileUrl}
                          download
                          className="px-2.5 py-1 text-xs font-semibold text-[#1877F2] hover:bg-blue-50 rounded-lg transition-colors"
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
                  <p className="text-sm text-slate-400 font-medium">
                    No documents uploaded
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

function Field({
  label,
  value,
  mono,
  highlight,
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col rounded-xl border border-[#F1F3F6] bg-[#F8F9FB] p-3.5 transition-all duration-200 hover:border-blue-100 hover:bg-white hover:shadow-sm">
      <span className="text-[10px] font-bold uppercase tracking-wider text-[#8E99AF] mb-1">
        {label}
      </span>
      <span
        className={`text-[13px] font-semibold break-words ${
          highlight ? "text-emerald-700 font-bold" : "text-[#2D3748]"
        } ${mono ? "font-mono" : ""}`}
      >
        {value || "—"}
      </span>
    </div>
  );
}

function PayRow({
  label,
  value,
  mono,
  badge,
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
  badge?: string;
}) {
  const badgeColors: Record<string, string> = {
    Active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Lapsed: "bg-rose-50 text-rose-700 border-rose-200",
    Pending: "bg-amber-50 text-amber-700 border-amber-200",
    Claimed: "bg-purple-50 text-purple-700 border-purple-200",
  };
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8E99AF]">
        {label}
      </span>
      {badge ? (
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${badgeColors[badge] || "bg-slate-50 text-slate-700 border-slate-200"}`}
        >
          {value || "—"}
        </span>
      ) : (
        <span
          className={`font-semibold text-slate-900 text-sm ${mono ? "font-mono" : ""}`}
        >
          {value || "—"}
        </span>
      )}
    </div>
  );
}
