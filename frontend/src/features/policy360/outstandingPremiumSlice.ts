import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios, { isAxiosError } from "axios";

export interface OutstandingPremiumPolicy {
  policyId: string;
  policyNumber: string;
  lifeAssuredName: string;
  groupCode: string | null;
  planNumber: string | null;
  planName: string;
  premium: number;
  outstandingAmount: number;
  premiumDueDate: string;
  daysOverdue: number;
  mobileNumber: string | null;
  status: string;
}

interface OutstandingPremiumState {
  outstandingPremiums: OutstandingPremiumPolicy[];
  isLoading: boolean;
  error: string | null;
}

const initialState: OutstandingPremiumState = {
  outstandingPremiums: [],
  isLoading: false,
  error: null,
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export const fetchOutstandingPremiums = createAsyncThunk<
  OutstandingPremiumPolicy[],
  void,
  { rejectValue: string }
>("outstandingPremiums/fetchAll", async (_arg, { rejectWithValue }) => {
  try {
    const token = localStorage.getItem("token");
    const response = await axios.get(
      `${API_URL}/policy-360/outstanding`,
      token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
    );
    return response.data.data.outstandingPremiums;
  } catch (err: any) {
    if (isAxiosError(err)) {
      return rejectWithValue(
        err.response?.data?.message ?? "Failed to fetch outstanding premiums",
      );
    }
    return rejectWithValue("Failed to fetch outstanding premiums");
  }
});

const outstandingPremiumSlice = createSlice({
  name: "outstandingPremiums",
  initialState,
  reducers: {},
  extraReducers: (builder) =>
    builder
      .addCase(fetchOutstandingPremiums.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchOutstandingPremiums.fulfilled, (state, action) => {
        state.isLoading = false;
        state.outstandingPremiums = action.payload;
      })
      .addCase(fetchOutstandingPremiums.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? "Failed to fetch outstanding premiums";
      }),
});

export default outstandingPremiumSlice.reducer;
