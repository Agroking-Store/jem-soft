import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios, { isAxiosError } from "axios";
import type { RootState } from "@/store/store";

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
  createdById: string;
  updatedById?: string | null;
  createdAt: string;
  updatedAt: string;
  policy: {
    id: string;
    clientId: string;
    CustomerMasterId: string;
    providerId: string;
    productId: string;
    statusId: string;
    premiumModeId: string;
    advisorId?: string | null;
    branchId?: string | null;
    policyNumber: string;
    proposalNumber?: string | null;
    issueDate?: string | null;
    commencementDate: string;
    maturityDate?: string | null;
    policyTerm?: number | null;
    premiumPayingTerm?: number | null;
    nextPremiumDueDate?: string | null;
    remarks?: string | null;
    createdAt: string;
    updatedAt: string;
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
    status?: {
      id: string;
      statusName: string;
      statusCode: string;
    } | null;
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

export interface CreateClaimPayload {
  policyId: string;
  claimantName?: string;
  claimType: string;
  claimAmount: number;
  claimDate: string;
  reasonForClaim?: string;
  nomineeId?: string;
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

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

const getClaimsApi = () => api.get("/claims");

const createClaimApi = (claimData: CreateClaimPayload) =>
  api.post("/claims", claimData);

const updateClaimApi = (id: string, claimData: Partial<CreateClaimPayload>) =>
  api.put(`/claims/${id}`, claimData);

const deleteClaimApi = (id: string) => api.delete(`/claims/${id}`);

export const fetchClaims = createAsyncThunk(
  "claims/fetchClaims",
  async (_, { rejectWithValue }) => {
    try {
      const res = await getClaimsApi();

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
  { rejectValue: string; state: RootState }
>("claims/fetchClaimById", async (id, { getState, rejectWithValue }) => {
  try {
    const token = getState().auth.token;

    const config = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };

    const response = await axios.get(`${API_URL}/claims/${id}`, config);

    return response.data.data.claim;
  } catch (error) {
    if (isAxiosError(error)) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch Claim",
      );
    }

    return rejectWithValue("Unexpected error while fetching Claim.");
  }
});

export const createClaim = createAsyncThunk(
  "claims/createClaim",
  async (claim: CreateClaimPayload, { rejectWithValue }) => {
    try {
      const res = await createClaimApi(claim);

      return res.data.data;
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to create claim",
      );
    }
  },
);

export const updateClaim = createAsyncThunk(
  "claims/updateClaim",
  async (
    {
      id,
      data,
    }: {
      id: string;
      data: Partial<CreateClaimPayload>;
    },
    { rejectWithValue },
  ) => {
    try {
      const res = await updateClaimApi(id, data);

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
      await deleteClaimApi(id);

      return id;
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to delete claim",
      );
    }
  },
);

const claimSlice = createSlice({
  name: "claims",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder

      // Fetch Claims
      .addCase(fetchClaims.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchClaims.fulfilled, (state, action) => {
        state.isLoading = false;
        state.claims = action.payload;
      })
      .addCase(fetchClaims.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Fetch one Claim
      .addCase(fetchClaimById.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchClaimById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selectedClaim = action.payload;
      })
      .addCase(fetchClaimById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? "Failed to fetch claim";
      })

      // Create Claim
      .addCase(createClaim.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createClaim.fulfilled, (state, action) => {
        state.isLoading = false;
        state.claims.push(action.payload);
      })
      .addCase(createClaim.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Update Claim
      .addCase(updateClaim.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(updateClaim.fulfilled, (state, action) => {
        state.isLoading = false;

        const index = state.claims.findIndex(
          (claim) => claim.id === action.payload.id,
        );

        if (index !== -1) {
          state.claims[index] = action.payload;
        }
      })
      .addCase(updateClaim.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Delete Claim
      .addCase(deleteClaim.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(deleteClaim.fulfilled, (state, action) => {
        state.isLoading = false;
        state.claims = state.claims.filter(
          (claim) => claim.id !== action.payload,
        );
      })
      .addCase(deleteClaim.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const selectSelectedClaim = (state: RootState) =>
  state.claims.selectedClaim;

export default claimSlice.reducer;
