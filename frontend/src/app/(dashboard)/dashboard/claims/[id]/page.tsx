"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { RootState, AppDispatch } from "@/store/store";
import { fetchClaimById } from "@/features/claim/claimSlice";
import { useRouter, useParams } from "next/navigation";



export default function ViewClaimPage()
{

     const router = useRouter();
      const params = useParams();
    const id = params.id as string;
    const dispatch = useDispatch<AppDispatch>();

     const { selectedClaim, isLoading, error } = useSelector(
    (state: RootState) => state.claims,
  );

  useEffect(() => {
      if (id) {
        dispatch(fetchClaimById(id as string));
      }
    }, [dispatch, id]);


  console.log(selectedClaim)

  return(
    <h1>This is the Claim Page Work In Progress - Claim ID : {selectedClaim?.id}</h1>
  )
}