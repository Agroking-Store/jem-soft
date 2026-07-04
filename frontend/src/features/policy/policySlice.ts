import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

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

interface PolicyState {
  policies: any[];
  isLoading: boolean;
  error: string | null;
}

const initialState: PolicyState = {
  policies: [],
  isLoading: false,
  error: null,
};


const getPoliciesApi = () => api.get(`${API_URL}/policies`);
const deletePolicyApi = (id: string) => api.delete(`${API_URL}/policies/${id}`);
const createPolicyApi = (policyData: any) => api.post(`${API_URL}/policies`, policyData);

export const fetchPolicies = createAsyncThunk(
  "policies/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const response = await getPoliciesApi();
      return response.data.data.policies;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message ?? "Failed to fetch policies");
    }
  }
);

export const deletePolicy = createAsyncThunk(
  "policies/delete",
  async (id: string, { rejectWithValue }) => {
    try {
      const policyToDelete = (getState() as RootState).policies.policies.find(p => p.id === id);
      await deletePolicyApi(id);
      return { id, policyNumber: policyToDelete?.policyNumber };
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message ?? "Failed to delete policy");
    }
  }
);

export const createPolicy = createAsyncThunk(
  "policies/create",
  async (policyData: any, { rejectWithValue }) => {
    try {
      const response = await createPolicyApi(policyData);
      return response.data.data.policy;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message ?? "Failed to create policy");
    }
  }
);

const policySlice = createSlice({
  name: "policies",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPolicies.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPolicies.fulfilled, (state, action) => {
        state.isLoading = false;
        state.policies = action.payload;
      })
      .addCase(fetchPolicies.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    builder
      .addCase(deletePolicy.pending, (state) => {
        // Optionally handle loading state for delete
      })
      .addCase(deletePolicy.fulfilled, (state, action) => {
        state.policies = state.policies.filter((p) => p.id !== action.payload.id);
      })
      .addCase(deletePolicy.rejected, (state, action) => {
        state.error = action.payload as string; // You might want a specific error state for this
      });

    builder
      .addCase(createPolicy.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(createPolicy.fulfilled, (state, action) => {
        state.isLoading = false;
        state.policies.push(action.payload);
      })
      .addCase(createPolicy.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export default policySlice.reducer;