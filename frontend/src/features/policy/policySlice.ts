import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios, { isAxiosError } from "axios";
import type { RootState } from "@/store/store";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export interface Policy {
  id: string;
  // Add other policy fields as needed for display
  [key: string]: any;
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

export const fetchPolicies = createAsyncThunk<Policy[], void, { rejectValue: string; state: RootState }>(
  "policies/fetchPolicies",
  async (_, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      const config = {
        headers: { Authorization: `Bearer ${token}` },
      };
      const response = await axios.get(`${API_URL}/policies`, config);
      return response.data.data.policies;
    } catch (error) {
      if (isAxiosError(error)) {
        return rejectWithValue(error.response?.data?.message || "Failed to fetch policies");
      }
      return rejectWithValue("An unexpected error occurred while fetching policies.");
    }
  }
);

export const createPolicy = createAsyncThunk<Policy, any, { rejectValue: string; state: RootState }>(
  "policies/createPolicy",
  async (policyData, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      const config = {
        headers: { Authorization: `Bearer ${token}` },
      };
      const response = await axios.post(`${API_URL}/policies`, policyData, config);
      return response.data.data.policy;
    } catch (error) {
      if (isAxiosError(error)) {
        return rejectWithValue(error.response?.data?.message || "Failed to create policy");
      }
      return rejectWithValue("An unexpected error occurred while creating the policy.");
    }
  }
);

const policySlice = createSlice({
  name: "policies",
  initialState,
  reducers: {},
  extraReducers: (builder) => { builder.addCase(fetchPolicies.pending, (state) => { state.isLoading = true; }).addCase(fetchPolicies.fulfilled, (state, action) => { state.isLoading = false; state.policies = action.payload; }).addCase(fetchPolicies.rejected, (state, action) => { state.isLoading = false; state.error = action.payload ?? "Failed to fetch"; }).addCase(createPolicy.fulfilled, (state, action) => { state.policies.push(action.payload); }); },
});

export default policySlice.reducer;