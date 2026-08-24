import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios, { isAxiosError } from "axios";
import type { RootState } from "@/store/store";

/* ═══════════════════════════════════════════════════════════
 * TYPES
 * ═══════════════════════════════════════════════════════════ */

export interface ClaimDocument {
  id: string;
  claimId: string;
  fileName: string;
  originalName: string;
  fileUrl: string;
  fileType?: string;
  fileSize?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Claim {
  id: string;
  policyId: string;
  claimantName?: string;
  claimType: string;
  claimAmount: number;
  status: string;
  claimDate: string;
  reasonForClaim?: string | null;
  nomineeId?: string | null;
  paymentType?: string | null;
  chequeNumber?: string | null;
  chequeDate?: string | null;
  bankName?: string | null;
  branchName?: string | null;
  chequeAmount?: number | null;
  accountHolderName?: string | null;
  accountNumber?: string | null;
  ifscCode?: string | null;
  createdById: string;
  updatedById?: string | null;
  createdAt: string;
  updatedAt: string;
  documents?: ClaimDocument[];
  policy: {
    id: string;
    policyNumber: string;
    commencementDate: string;
    maturityDate?: string | null;
    premiumPayingTerm?: number | null;
    CustomerMaster: {
      id: string;
      salutation?: string | null;
      firstName: string;
      middleName?: string | null;
      lastName: string;
    } | null;
    product?: {
      id: string;
      productName: string;
      planNumber?: string | null;
    } | null;
    status?: { id: string; statusName: string; statusCode: string } | null;
    premium?: {
      id: string;
      sumAssured: number;
      installmentPremium: number;
      totalInstallmentPremium: number;
    } | null;
    nominees?: any[];
  };
  nominee?: {
    id: string;
    nomineeName: string;
    relationship: string;
  } | null;
}

export interface ClaimCalculation {
  maxClaimAmount: number | null;
  breakdown: {
    sumAssured: number;
    reversionaryBonus: number;
    finalAdditionalBonus: number;
    loyaltyAddition: number;
    bonus: number;
    outstandingLoan: number;
    loanInterest: number;
    totalDeduction: number;
    grossAmount: number | null;
  };
  loanDetails: {
    loanAmount: number;
    outstandingPrincipal: number;
    accruedInterest: number;
    totalRepaid: number;
    interestRate: number;
    daysSinceLastPayment: number;
  } | null;
  surrenderInfo: {
    gsv: number;
    ssv: number;
    surrenderValue: number;
    basicPremium: number;
    numberOfPremiumsPaid: number;
    gsvPercentage: number;
    ssvPercentage: number;
  } | null;
}

export interface CreateClaimPayload {
  policyId: string;
  claimantName?: string;
  claimType: string;
  claimAmount: number;
  claimDate: string;
  status?: string;
  reasonForClaim?: string;
  nomineeId?: string;
  paymentType?: string;
  chequeNumber?: string;
  chequeDate?: string;
  bankName?: string;
  branchName?: string;
  chequeAmount?: number;
  accountHolderName?: string;
  accountNumber?: string;
  ifscCode?: string;
}

interface ClaimState {
  claims: Claim[];
  selectedClaim: Claim | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: ClaimState = {
  claims: [],
  selectedClaim: null,
  isLoading: false,
  error: null,
};

/* ═══════════════════════════════════════════════════════════
 * API
 * ═══════════════════════════════════════════════════════════ */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/* ═══════════════════════════════════════════════════════════
 * THUNKS
 * ═══════════════════════════════════════════════════════════ */

export const fetchClaims = createAsyncThunk(
  "claims/fetchClaims",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get("/claims");
      return res.data.data;
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch claims",
      );
    }
  },
);

export const fetchClaimById = createAsyncThunk<
  Claim,
  string,
  { rejectValue: string }
>("claims/fetchClaimById", async (id, { rejectWithValue }) => {
  try {
    const response = await api.get(`/claims/${id}`);
    return response.data.data.claim;
  } catch (err) {
    if (isAxiosError(err)) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch claim",
      );
    }
    return rejectWithValue("Unexpected error.");
  }
});

export const createClaim = createAsyncThunk(
  "claims/createClaim",
  async (claim: CreateClaimPayload, { rejectWithValue }) => {
    try {
      const res = await api.post("/claims", claim);
      return res.data.data;
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to create claim",
      );
    }
  },
);

export const calculateClaimAmount = createAsyncThunk(
  "claims/calculateClaimAmount",
  async (
    {
      policyId,
      claimType,
      claimDate,
    }: { policyId: string; claimType: string; claimDate?: string },
    { rejectWithValue },
  ) => {
    try {
      let url = `/claims/calculate?policyId=${policyId}&claimType=${encodeURIComponent(claimType)}`;
      if (claimDate) url += `&claimDate=${encodeURIComponent(claimDate)}`;
      const res = await api.get(url);
      return res.data.data as ClaimCalculation;
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to calculate claim amount",
      );
    }
  },
);

export const updateClaim = createAsyncThunk(
  "claims/updateClaim",
  async (
    { id, data }: { id: string; data: Partial<CreateClaimPayload> },
    { rejectWithValue },
  ) => {
    try {
      const res = await api.put(`/claims/${id}`, data);
      return res.data.data;
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to update claim",
      );
    }
  },
);

export const deleteClaim = createAsyncThunk(
  "claims/deleteClaim",
  async (id: string, { rejectWithValue }) => {
    try {
      await api.delete(`/claims/${id}`);
      return id;
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to delete claim",
      );
    }
  },
);

export const uploadClaimDocuments = createAsyncThunk(
  "claims/uploadDocuments",
  async (
    { claimId, files }: { claimId: string; files: File[] },
    { rejectWithValue },
  ) => {
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("documents", file));
      const response = await api.post(`/claims/${claimId}/documents`, formData);
      return response.data.data;
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to upload documents",
      );
    }
  },
);

export const deleteClaimDocument = createAsyncThunk(
  "claims/deleteDocument",
  async (
    { claimId, documentId }: { claimId: string; documentId: string },
    { rejectWithValue },
  ) => {
    try {
      await api.delete(`/claims/${claimId}/documents/${documentId}`);
      return documentId;
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to delete document",
      );
    }
  },
);

/* ═══════════════════════════════════════════════════════════
 * SLICE
 * ═══════════════════════════════════════════════════════════ */

const claimSlice = createSlice({
  name: "claims",
  initialState,
  reducers: {
    clearSelectedClaim: (state) => {
      state.selectedClaim = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchClaims.pending, (s) => {
        s.isLoading = true;
        s.error = null;
      })
      .addCase(fetchClaims.fulfilled, (s, a) => {
        s.isLoading = false;
        s.claims = a.payload;
      })
      .addCase(fetchClaims.rejected, (s, a) => {
        s.isLoading = false;
        s.error = a.payload as string;
      })

      .addCase(fetchClaimById.pending, (s) => {
        s.isLoading = true;
      })
      .addCase(fetchClaimById.fulfilled, (s, a) => {
        s.isLoading = false;
        s.selectedClaim = a.payload;
      })
      .addCase(fetchClaimById.rejected, (s, a) => {
        s.isLoading = false;
        s.error = a.payload ?? "Failed";
      })

      .addCase(createClaim.pending, (s) => {
        s.isLoading = true;
        s.error = null;
      })
      .addCase(createClaim.fulfilled, (s, a) => {
        s.isLoading = false;
        s.claims.unshift(a.payload);
      })
      .addCase(createClaim.rejected, (s, a) => {
        s.isLoading = false;
        s.error = a.payload as string;
      })

      .addCase(updateClaim.pending, (s) => {
        s.isLoading = true;
      })
      .addCase(updateClaim.fulfilled, (s, a) => {
        s.isLoading = false;
        const idx = s.claims.findIndex((c) => c.id === a.payload.id);
        if (idx !== -1) s.claims[idx] = a.payload;
        s.selectedClaim = a.payload;
      })
      .addCase(updateClaim.rejected, (s, a) => {
        s.isLoading = false;
        s.error = a.payload as string;
      })

      .addCase(deleteClaim.pending, (s) => {
        s.isLoading = true;
      })
      .addCase(deleteClaim.fulfilled, (s, a) => {
        s.isLoading = false;
        s.claims = s.claims.filter((c) => c.id !== a.payload);
      })
      .addCase(deleteClaim.rejected, (s, a) => {
        s.isLoading = false;
        s.error = a.payload as string;
      });
  },
});

export const { clearSelectedClaim } = claimSlice.actions;
export const selectSelectedClaim = (state: RootState) =>
  state.claims.selectedClaim;
export default claimSlice.reducer;
