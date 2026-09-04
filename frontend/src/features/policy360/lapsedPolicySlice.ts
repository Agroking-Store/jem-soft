import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios, { isAxiosError } from "axios";

export interface LapsedPolicy {
  policyId: string;
  policyNumber: string;
  lifeAssuredName: string;
  planNumber: string | null;
  planName: string;
  premiumAmount: number;
  premiumMode: string;
  premiumDueDate: string;
  daysUnpaid: number;
  mobileNumber: string | null;
  status: string;
}

interface LapsedPolicyState {
  lapsedPolicies: LapsedPolicy[];
  isLoading: boolean;
  error: string | null;
}

const initialState: LapsedPolicyState = {
  lapsedPolicies: [],
  isLoading: false,
  error: null,
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export const fetchLapsedPolicies = createAsyncThunk<
  LapsedPolicy[],
  void,
  { rejectValue: string }
>("lapsedPolicies/fetchAll", async (_arg, { rejectWithValue }) => {
  try {
    const token = localStorage.getItem("token");
    const response = await axios.get(
      `${API_URL}/policy-360/lapsed`,
      token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
    );
    return response.data.data.lapsedPolicies;
  } catch (err: any) {
    if (isAxiosError(err)) {
      return rejectWithValue(
        err.response?.data?.message ?? "Failed to fetch lapsed policies",
      );
    }
    return rejectWithValue("Failed to fetch lapsed policies");
  }
});

const lapsedPolicySlice = createSlice({
  name: "lapsedPolicies",
  initialState,
  reducers: {},
  extraReducers: (builder) =>
    builder
      .addCase(fetchLapsedPolicies.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchLapsedPolicies.fulfilled, (state, action) => {
        state.isLoading = false;
        state.lapsedPolicies = action.payload;
      })
      .addCase(fetchLapsedPolicies.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? "Failed to fetch lapsed policies";
      }),
});

export default lapsedPolicySlice.reducer;
