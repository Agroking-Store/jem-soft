import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios, { isAxiosError } from "axios";
import type { RootState } from "@/store/store";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export interface PremiumModeMaster {
  id: string;
  modeName: string;
  modeCode: string;
  months : number;
}

interface PremiumModeState {
  modes: PremiumModeMaster[];
  isLoading: boolean;
  error: string | null;
}

const initialState: PremiumModeState = {
  modes: [],
  isLoading: false,
  error: null,
};

export const fetchPremiumModes = createAsyncThunk<PremiumModeMaster[], void, { rejectValue: string; state: RootState }>(
  "premiumModes/fetch",
  async (_, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      const response = await axios.get(`${API_URL}/premium-modes`, { headers: { Authorization: `Bearer ${token}` } });
      return response.data.data.modes;
    } catch (error) {
      if (isAxiosError(error)) { return rejectWithValue(error.response?.data?.message || "Failed to fetch premium modes"); }
      return rejectWithValue("An unexpected error occurred.");
    }
  }
);

const premiumModeMasterSlice = createSlice({
  name: "premiumModes",
  initialState,
  reducers: {},
  extraReducers: (builder) => { builder.addCase(fetchPremiumModes.pending, (state) => { state.isLoading = true; }).addCase(fetchPremiumModes.fulfilled, (state, action) => { state.isLoading = false; state.modes = action.payload; }).addCase(fetchPremiumModes.rejected, (state, action) => { state.isLoading = false; state.error = action.payload ?? "Failed to fetch"; }); },
});

export default premiumModeMasterSlice.reducer;