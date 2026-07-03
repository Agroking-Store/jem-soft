import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios, { isAxiosError } from "axios";
import type { RootState } from "@/store/store";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export interface PolicyStatusMaster {
  id: string;
  statusName: string;
  statusCode: string;
}

interface PolicyStatusState {
  statuses: PolicyStatusMaster[];
  isLoading: boolean;
  error: string | null;
}

const initialState: PolicyStatusState = {
  statuses: [],
  isLoading: false,
  error: null,
};

export const fetchPolicyStatuses = createAsyncThunk<PolicyStatusMaster[], void, { rejectValue: string; state: RootState }>(
  "policyStatuses/fetch",
  async (_, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      const response = await axios.get(`${API_URL}/policy-statuses`, { headers: { Authorization: `Bearer ${token}` } });
      return response.data.data.statuses;
    } catch (error) {
      if (isAxiosError(error)) { return rejectWithValue(error.response?.data?.message || "Failed to fetch policy statuses"); }
      return rejectWithValue("An unexpected error occurred.");
    }
  }
);

const policyStatusMasterSlice = createSlice({
  name: "policyStatuses",
  initialState,
  reducers: {},
  extraReducers: (builder) => { builder.addCase(fetchPolicyStatuses.pending, (state) => { state.isLoading = true; }).addCase(fetchPolicyStatuses.fulfilled, (state, action) => { state.isLoading = false; state.statuses = action.payload; }).addCase(fetchPolicyStatuses.rejected, (state, action) => { state.isLoading = false; state.error = action.payload ?? "Failed to fetch"; }); },
});

export default policyStatusMasterSlice.reducer;