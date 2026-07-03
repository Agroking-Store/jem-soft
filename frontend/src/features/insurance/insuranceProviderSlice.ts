import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import axios, { isAxiosError } from "axios";
import type { RootState } from "@/store/store";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export interface InsuranceProvider {
  id: string;
  type: string;
  name: string;
  code: string;
  description?: string | null;
  isActive: boolean;
}

interface InsuranceProviderState {
  providers: InsuranceProvider[];
  isLoading: boolean;
  error: string | null;
}

const initialState: InsuranceProviderState = {
  providers: [],
  isLoading: false,
  error: null,
};

export const fetchInsuranceProviders = createAsyncThunk<InsuranceProvider[], void, { rejectValue: string; state: RootState }>(
  "insuranceProviders/fetch",
  async (_, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      const config = {
        headers: { Authorization: `Bearer ${token}` },
      };
      const response = await axios.get(`${API_URL}/insurance-providers`, config);
      return response.data.data;
    } catch (error) {
      if (isAxiosError(error)) {
        return rejectWithValue(error.response?.data?.message || "Failed to fetch insurance providers");
      }
      return rejectWithValue("An unexpected error occurred while fetching insurance providers.");
    }
  }
);

const insuranceProviderSlice = createSlice({
  name: "insuranceProviders",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchInsuranceProviders.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(fetchInsuranceProviders.fulfilled, (state, action: PayloadAction<InsuranceProvider[]>) => { state.isLoading = false; state.providers = action.payload; })
      .addCase(fetchInsuranceProviders.rejected, (state, action) => { state.isLoading = false; state.error = action.payload || "An unknown error occurred"; });
  },
});

export default insuranceProviderSlice.reducer;