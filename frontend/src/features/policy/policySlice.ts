import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios, { isAxiosError } from "axios";
import type { RootState } from "@/store/store";

export interface Policy {
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
  CustomerMaster?: {
    id: string;
    salutation?: string | null;
    firstName: string;
    middleName?: string | null;
    lastName: string;
    gender?: string | null;
    dob?: string | null;
    panNumber?: string | null;
    bankDetails?: {
      id: string;
      isDefault: boolean;
      bankName?: string | null;
      bankBranch?: string | null;
      city?: string | null;
      accountType?: string | null;
      accountNumber?: string | null;
      ifscCode?: string | null;
      micrNumber?: string | null;
      accountHolderName?: string | null;
    }[];
  } | null;
  customer?: {
    id: string;
    groupCode?: string | null;
    groupName?: string | null;
    name: string;
  } | null;
  provider?: {
    id: string;
    name: string;
    type?: string;
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
  premiumMode?: {
    id: string;
    modeName: string;
  } | null;
  premium?: {
    id: string;
    sumAssured: number;
    basicYearlyPremium?: number;
    totalYearlyPremium?: number;
    installmentPremium: number;
    totalInstallmentPremium: number;
    gst?: number;
    extraClass?: number;
  } | null;
  // Kept custom fields from the feature branch below:
  nominees?: any[];
  policyRiders?: any[];
  policyAttributes?: {
    id: string;
    attributeId: string;
    value: string;
    attribute?: {
      id: string;
      attributeCode: string;
      attributeName: string;
    };
  }[];
  advisor?: any;
  agentCode?: string;
  branch?: any;
  mode?: string;
  policyStatus?: string;
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

const getPoliciesApi = () => api.get(`${API_URL}/policies`);
const getPoliciesByMemberApi = (memberId: string) =>
  api.get(`${API_URL}/policies/member/${memberId}`);
const deletePolicyApi = (id: string) => api.delete(`${API_URL}/policies/${id}`);
const createPolicyApi = (policyData: any) =>
  api.post(`${API_URL}/policies`, policyData);

export const fetchPolicies = createAsyncThunk<
  Policy[],
  void,
  { rejectValue: string }
>("policies/fetchAll", async (_, { rejectWithValue }) => {
  try {
    const response = await getPoliciesApi();
    return response.data.data.policies;
  } catch (err: any) {
    return rejectWithValue(
      err.response?.data?.message ?? "Failed to fetch policies",
    );
  }
});

export const fetchPoliciesByMember = createAsyncThunk<
  Policy[],
  string,
  { rejectValue: string }
>("policies/fetchByMember", async (memberId, { rejectWithValue }) => {
  try {
    const response = await getPoliciesByMemberApi(memberId);
    return response.data.data.policies;
  } catch (err: any) {
    return rejectWithValue(
      err.response?.data?.message ?? "Failed to fetch member policies",
    );
  }
});

export const deletePolicy = createAsyncThunk<
  { id: string; policyNumber: string },
  string,
  { state: RootState; rejectValue: string }
>("policies/delete", async (id: string, { getState, rejectWithValue }) => {
  try {
    const policyToDelete = (getState() as RootState).policies.policies.find(
      (p) => p.id === id,
    );
    await deletePolicyApi(id);
    return { id, policyNumber: policyToDelete?.policyNumber ?? "Unknown" };
  } catch (err: any) {
    return rejectWithValue(
      err.response?.data?.message ?? "Failed to delete policy",
    );
  }
});

export const createPolicy = createAsyncThunk<
  Policy,
  any,
  { rejectValue: string }
>("policies/create", async (policyData: any, { rejectWithValue }) => {
  try {
    const response = await createPolicyApi(policyData);
    return response.data.data.policy;
  } catch (err: any) {
    return rejectWithValue(
      err.response?.data?.message ?? "Failed to create policy",
    );
  }
});

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
      // Fetch all policies
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

      // Fetch policies for a specific member (Customer Master details)
      .addCase(fetchPoliciesByMember.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchPoliciesByMember.fulfilled, (state, action) => {
        state.isLoading = false;
        state.policies = action.payload;
      })
      .addCase(fetchPoliciesByMember.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? "Failed to fetch member policies";
      })

      // Create policy
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

      // Fetch one policy
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

      // Update policy
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
      })

      // Delete policy
      .addCase(deletePolicy.fulfilled, (state, action) => {
        state.isLoading = false;
        state.policies = state.policies.filter(
          (p) => p.id !== action.payload.id,
        );
      })
      .addCase(deletePolicy.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? "Failed to delete policy";
      });
  },
});

export const selectSelectedPolicy = (state: RootState) =>
  state.policies.selectedPolicy;

export default policySlice.reducer;
