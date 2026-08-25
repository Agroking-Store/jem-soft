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
  Edit,
} from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  CustomerSectionCard,
  CustomerBreadcrumbs,
} from "@/features/customers/components/CustomerUi";

const STATUS_MAP: Record<string, { color: string; icon: any }> = {
  Approved: { color: "bg-green-100 text-green-700", icon: CheckCircle },
  Settled: { color: "bg-blue-100 text-blue-700", icon: CheckCircle },
  Rejected: { color: "bg-red-100 text-red-700", icon: XCircle },
  "In Progress": { color: "bg-blue-100 text-blue-700", icon: Clock },
  Pending: { color: "bg-yellow-100 text-yellow-700", icon: Clock },
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
        <p className="mt-4 text-sm text-slate-500">Loading claim...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="text-red-600" size={20} />
          <div>
            <p className="text-red-800 font-medium">Unable to load claim</p>
            <p className="text-red-600 text-sm">{error}</p>
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
    color: "bg-slate-100 text-slate-700",
    icon: AlertCircle,
  };
  const StatusIcon = badge.icon;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <CustomerBreadcrumbs
        items={[
          { label: "Claims", href: "/dashboard/claims" },
          { label: "Claim Details" },
        ]}
      />

      <div className="flex items-start justify-between">
        <div>
          <h1 className="mt-2 font-serif text-2xl font-semibold tracking-tight sm:text-[28px] text-slate-900">
            Claim Details
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            View complete claim information.
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() =>
              router.push(`/dashboard/claims/edit/${selectedClaim.id}`)
            }
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
          >
            <Edit size={16} /> Edit Claim
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT */}
        <div className="lg:col-span-2 space-y-6">
          <CustomerSectionCard title="Claim Information" icon={FileText}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Status
                </p>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${badge.color}`}
                >
                  <StatusIcon size={13} /> {selectedClaim.status}
                </span>
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
              <div className="space-y-4">
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
              <div className="space-y-4">
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
              <div className="space-y-4">
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
                <div className="space-y-3">
                  {selectedClaim.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-lg border border-slate-200 group"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <FileText size={18} className="text-slate-400" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {doc.originalName}
                          </p>
                          <p className="text-xs text-slate-500">
                            {((doc.fileSize || 0) / 1024).toFixed(2)} KB •{" "}
                            {new Date(doc.createdAt).toLocaleDateString(
                              "en-IN",
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          View
                        </a>
                        <a
                          href={doc.fileUrl}
                          download
                          className="px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg"
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
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
        {label}
      </p>
      <p
        className={`font-semibold ${highlight ? "text-emerald-700" : "text-slate-900"} ${mono ? "font-mono" : ""}`}
      >
        {value || "—"}
      </p>
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
    Active: "bg-green-100 text-green-700",
    Lapsed: "bg-red-100 text-red-700",
    Pending: "bg-blue-100 text-blue-700",
    Claimed: "bg-purple-100 text-purple-700",
  };
  return (
    <div className="flex justify-between items-center">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      {badge ? (
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${badgeColors[badge] || "bg-slate-100 text-slate-700"}`}
        >
          {value || "—"}
        </span>
      ) : (
        <p
          className={`font-semibold text-slate-900 text-sm ${mono ? "font-mono" : ""}`}
        >
          {value || "—"}
        </p>
      )}
    </div>
  );
}
