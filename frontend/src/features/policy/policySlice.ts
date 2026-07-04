import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios, { isAxiosError } from "axios";
import type { RootState } from "@/store/store";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export interface PolicyCustomer {
  id: string;
  groupCode?: string | null;
  groupName?: string | null;
  companyName?: string | null;
}

export interface PolicyProduct {
  id: string;
  productName?: string | null;
  planNumber?: string | null;
}

export interface PolicyProvider {
  name?: string | null;
  type?: string | null;
}

export interface PolicyStatus {
  statusName?: string | null;
}

export interface PolicyPremiumMode {
  modeName?: string | null;
}

export interface PolicyAdvisor {
  advisorName?: string | null;
  advisorCode?: string | null;
}

export interface PolicyPremium {
  sumAssured?: number | null;
  installmentPremium?: number | null;
  gst?: number | null;
}

export interface PolicyCustomerMaster {
  firstName?: string | null;
  lastName?: string | null;
}

export interface Policy {
  id: string;
  policyNumber: string;
  policyTerm?: number | null;
  premiumPayingTerm?: number | null;
  nextPremiumDueDate?: string | null;
  commencementDate: string;
  maturityDate?: string | null;
  customer?: PolicyCustomer;
  provider?: PolicyProvider;
  product?: PolicyProduct;
  status?: PolicyStatus;
  premiumMode?: PolicyPremiumMode;
  advisor?: PolicyAdvisor;
  premium?: PolicyPremium;
  CustomerMaster?: PolicyCustomerMaster;
}

interface PolicyState {
  policies: Policy[];
  isLoading: boolean;
  error: string | null;
}

const initialState: PolicyState = {
  policies: [],
  isLoading: false,
  error: null,
};

export const fetchPolicies = createAsyncThunk<
  Policy[],
  void,
  { rejectValue: string; state: RootState }
>("policies/fetchPolicies", async (_, { getState, rejectWithValue }) => {
  try {
    const token = getState().auth.token;
    const config = {
      headers: { Authorization: `Bearer ${token}` },
    };
    const response = await axios.get(`${API_URL}/policies`, config);
    return response.data.data.policies;
  } catch (error) {
    if (isAxiosError(error)) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch policies",
      );
    }
    return rejectWithValue(
      "An unexpected error occurred while fetching policies.",
    );
  }
});

export type CreatePolicyPayload = {
  groupId: string;
  lifeAssuredId: string;
  providerId: string;
  policyNumber: string;
  productId: string;
  mode: string;
  commencementDate: string;
  completionDate?: string;
  term?: number;
  ppt?: number;
  extraClass?: string;
  ratePercent?: number;
  sumAssured?: number;
  basicYearlyPremium?: number;
  totalYearlyPremium?: number;
  totalRiderPremium?: number;
  installmentPremium?: number;
  gst?: number;
  totalInstallmentPremium?: number;
  riders?: Array<{
    description: string;
    sum?: number;
    term?: number;
    ppt?: number;
    premium?: number;
  }>;
  advisorId?: string;
  agentCode?: string;
};

export const createPolicy = createAsyncThunk<
  Policy,
  CreatePolicyPayload,
  { rejectValue: string; state: RootState }
>(
  "policies/createPolicy",
  async (policyData, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      const config = {
        headers: { Authorization: `Bearer ${token}` },
      };
      const response = await axios.post(
        `${API_URL}/policies`,
        policyData,
        config,
      );
      return response.data.data.policy;
    } catch (error) {
      if (isAxiosError(error)) {
        return rejectWithValue(
          error.response?.data?.message || "Failed to create policy",
        );
      }
      return rejectWithValue(
        "An unexpected error occurred while creating the policy.",
      );
    }
  },
);

const policySlice = createSlice({
  name: "policies",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPolicies.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchPolicies.fulfilled, (state, action) => {
        state.isLoading = false;
        state.policies = action.payload;
      })
      .addCase(fetchPolicies.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? "Failed to fetch";
      })
      .addCase(createPolicy.fulfilled, (state, action) => {
        state.policies.push(action.payload);
      });
  },
});

export default policySlice.reducer;
