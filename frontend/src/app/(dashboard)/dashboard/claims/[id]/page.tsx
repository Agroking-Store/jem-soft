"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { RootState, AppDispatch } from "@/store/store";
import { fetchClaimById } from "@/features/claim/claimSlice";
import { useRouter, useParams } from "next/navigation";

import Link from "next/link";
import { ChevronRight, AlertCircle } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";

export default function ViewClaimPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const dispatch = useDispatch<AppDispatch>();
  const user = useAuth();

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

  console.log(selectedClaim);

  return (
    <div className="bg-white w-full border border-slate-200 rounded-xl p-6 transition-all duration-500">
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Link href="/dashboard/claims" className="hover:text-blue-600">
            Claims
          </Link>
          <ChevronRight size={16} />
          <span className="font-medium text-slate-700">Claim Details</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mt-5">
          Claim Details
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          View complete claim information.
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white col-span-2 w-full border border-slate-200 rounded-xl p-6 transition-all duration-500">
          <p className="text-lg font-bold">Claim Information</p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-5">
            <div className="flex col-span-1 justify-between">
              <p className="block text-slate-500 font-semibold">Claim Number</p>
              <p className="font-semibold">{selectedClaim?.id}</p>
            </div>
            <div className="flex col-span-1 justify-between">
              <p className="block text-slate-500 font-semibold">Claim Date</p>
              <p className="font-semibold">
                {new Date(selectedClaim?.claimDate || "").toLocaleDateString()}
              </p>
            </div>
            <div className="flex col-span-1 justify-between">
              <p className="block text-slate-500 font-semibold">
                Policy Number
              </p>
              <p className="font-semibold">
                {selectedClaim?.policy?.policyNumber}
              </p>
            </div>
            <div className="flex col-span-1 justify-between">
              <p className="block text-slate-500 font-semibold">
                Customer Name
              </p>
              <p className="font-semibold">{customerFullName}</p>
            </div>
            <div className="flex col-span-1 justify-between">
              <p className="block text-slate-500 font-semibold">Claim Type</p>
              <p className="font-semibold">{selectedClaim?.claimType}</p>
            </div>
            <div className="flex col-span-1 justify-between">
              <p className="block text-slate-500 font-semibold">
                Claimed Amount
              </p>
              <p className="font-semibold">
                {" "}
                ₹ {selectedClaim?.claimAmount.toLocaleString("en-IN")}
              </p>
            </div>
            <div className="flex col-span-1 justify-between">
              <p className="block text-slate-500 font-semibold">
                Claimant Name
              </p>
              <p className="font-semibold">{selectedClaim?.claimantName}</p>
            </div>
            <div className="flex col-span-1 justify-between">
              <p className="block text-slate-500 font-semibold">
                Reason for Claim
              </p>
              <p className="font-semibold">
                {selectedClaim?.reasonForClaim || "—"}
              </p>
            </div>
            <div className="flex col-span-1 justify-between">
              <p className="block text-slate-500 font-semibold">Claim Status</p>
              <p
                className={`px-2 py-1 rounded-full text-xs font-medium
                    ${
                      selectedClaim?.status === "Approved"
                        ? "bg-green-100 text-green-700"
                        : selectedClaim?.status === "Rejected"
                          ? "bg-red-100 text-red-700"
                          : selectedClaim?.status === "In Progress"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-yellow-100 text-yellow-700"
                    }`}
              >
                {selectedClaim?.status}
              </p>
            </div>
            <div className="flex col-span-1 justify-between">
              <p className="block text-slate-500 font-semibold">Created By</p>
              <p className="font-semibold">{`${user.user?.name} (${user.user?.role})`}</p>
            </div>
          </div>
        </div>
        <div className="bg-white col-span-2 lg:col-span-1 w-full border border-slate-200 rounded-xl p-6 transition-all duration-500">
          <p className="text-lg font-bold">Policy Information</p>
          <div className="flex justify-between mt-5">
            <p className="block text-slate-500 font-semibold">Policy Name</p>
            <p className="font-semibold">
              {selectedClaim?.policy?.product?.productName}
            </p>
          </div>
          <div className="flex justify-between mt-5">
            <p className="block text-slate-500 font-semibold">Policy Status</p>
            <p
              className={`px-2 py-1 rounded-full text-xs font-medium
                    ${
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
            </p>
          </div>
          <div className="flex justify-between mt-5">
            <p className="block text-slate-500 font-semibold">Sum Assured</p>
            <p className="font-semibold">
              ₹{" "}
              {selectedClaim?.policy?.premium?.sumAssured.toLocaleString(
                "en-IN",
              )}
            </p>
          </div>
          <div className="flex justify-between mt-5">
            <p className="block text-slate-500 font-semibold">
              Policy Start Date
            </p>
            <p className="font-semibold">
              {new Date(
                selectedClaim?.policy?.commencementDate || "",
              ).toLocaleDateString()}
            </p>
          </div>
          <div className="flex justify-between mt-5">
            <p className="block text-slate-500 font-semibold">
              Policy End Date
            </p>
            <p className="font-semibold">
              {new Date(
                selectedClaim?.policy?.maturityDate || "",
              ).toLocaleDateString()}
            </p>
          </div>
          <div className="flex justify-between mt-5">
            <p className="block text-slate-500 font-semibold">
              Premium Paying Term
            </p>
            <p className="font-semibold">
              {selectedClaim?.policy?.premiumPayingTerm || "-"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
