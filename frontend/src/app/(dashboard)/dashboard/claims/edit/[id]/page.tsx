"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "@/store/store";
import { fetchClaimById } from "@/features/claim/claimSlice";
import ClaimForm from "../../ClaimForm";

export default function EditClaimPage() {
  const params = useParams();
  const id = params.id as string;
  const dispatch = useDispatch<AppDispatch>();

  const { selectedClaim, isLoading } = useSelector(
    (state: RootState) => state.claims,
  );

  useEffect(() => {
    if (id) {
      dispatch(fetchClaimById(id));
    }
  }, [dispatch, id]);

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

  return <ClaimForm mode="edit" initialClaim={selectedClaim} />;
}
