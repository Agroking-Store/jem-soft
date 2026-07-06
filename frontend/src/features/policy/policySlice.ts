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
  clientId?: string | null;
  CustomerMasterId?: string | null;
  providerId?: string | null;
  productId?: string | null;
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
  advisorId?: string | null;
  agentCode?: string | null;
  premium?: PolicyPremium & {
    basicYearlyPremium?: number | null;
    totalYearlyPremium?: number | null;
    totalInstallmentPremium?: number | null;
    totalRiderPremium?: number | null;
  };
  CustomerMaster?: PolicyCustomerMaster;
  policyRiders?: Array<{
    riderAmount?: number | null;
    riderPremium?: number | null;
    rider?: {
      riderName?: string | null;
    };
  }>;
}

interface PolicyState {
  policies: Policy[];
  selectedPolicy: Policy | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: PolicyState = {
  policies: [],
  selectedPolicy: null,
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

export const fetchPolicyById = createAsyncThunk<
  Policy,
  string,
  { rejectValue: string; state: RootState }
>("policies/fetchPolicyById", async (id, { getState, rejectWithValue }) => {
  try {
    const token = getState().auth.token;

    const config = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };

    const response = await axios.get(`${API_URL}/policies/${id}`, config);

    return response.data.data.policy;
  } catch (error) {
    if (isAxiosError(error)) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch policy",
      );
    }

    return rejectWithValue("Unexpected error while fetching policy.");
  }
});

export const updatePolicy = createAsyncThunk<
  Policy,
  { id: string; data: any },
  { rejectValue: string; state: RootState }
>(
  "policies/updatePolicy",
  async ({ id, data }, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;

      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };

      const response = await axios.put(
        `${API_URL}/policies/${id}`,
        data,
        config,
      );

      return response.data.data.policy;
    } catch (error) {
      if (isAxiosError(error)) {
        return rejectWithValue(
          error.response?.data?.message || "Failed to update policy",
        );
      }

      return rejectWithValue("Unexpected error while updating policy.");
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
        state.error = action.payload ?? "Failed to fetch policies";
      })
      .addCase(createPolicy.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(createPolicy.fulfilled, (state, action) => {
        state.isLoading = false;
        state.policies.push(action.payload);
      })
      .addCase(createPolicy.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? "Failed to create policy";
      })
      .addCase(fetchPolicyById.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchPolicyById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selectedPolicy = action.payload;
      })
      .addCase(fetchPolicyById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? "Failed to fetch policy";
      })
      .addCase(updatePolicy.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(updatePolicy.fulfilled, (state, action) => {
        state.isLoading = false;

        const index = state.policies.findIndex(
          (policy) => policy.id === action.payload.id,
        );

        if (index !== -1) {
          state.policies[index] = action.payload;
        }

        state.selectedPolicy = action.payload;
      })
      .addCase(updatePolicy.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? "Failed to update policy";
      });
  },
});

export const selectSelectedPolicy = (state: RootState) =>
  state.policies.selectedPolicy;

export default policySlice.reducer;
