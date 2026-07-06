import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import axios, { isAxiosError } from "axios";
import type { RootState } from "@/store/store";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export interface Agency {
  id: string;
  agencyCode: string;
  agencyName: string;
  branchId: string;
}

interface AgencyState {
  agencies: Agency[];
  isLoading: boolean;
  error: string | null;
}

const initialState: AgencyState = {
  agencies: [],
  isLoading: false,
  error: null,
};

export const fetchAgencies = createAsyncThunk<Agency[], void, { rejectValue: string; state: RootState }>(
  "agency/fetchAgencies",
  async (_, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const response = await axios.get(`${API_URL}/agencies`, config);
      return response.data.data.agencies;
    } catch (error) {
      if (isAxiosError(error)) {
        return rejectWithValue(error.response?.data?.message || "Failed to fetch agencies");
      }
      return rejectWithValue("An unexpected error occurred while fetching agencies.");
    }
  }
);

const agencySlice = createSlice({
  name: "agency",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAgencies.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(fetchAgencies.fulfilled, (state, action: PayloadAction<Agency[]>) => { state.isLoading = false; state.agencies = action.payload; })
      .addCase(fetchAgencies.rejected, (state, action) => { state.isLoading = false; state.error = action.payload || "Failed to fetch agencies"; });
  },
});

export default agencySlice.reducer;