import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios, { isAxiosError } from "axios";
import type { RootState } from "@/store/store";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export interface PaymentModeMaster {
  id: string;
  modeName: string;
  modeCode: string;
  description : string;
}

interface PaymentModeState {
  paymentModes: PaymentModeMaster[];
  isLoading: boolean;
  error: string | null;
}

const initialState: PaymentModeState = {
  paymentModes: [],
  isLoading: false,
  error: null,
};

export const fetchPaymentModes = createAsyncThunk<PaymentModeMaster[], void, { rejectValue: string; state: RootState }>(
  "paymentModes/fetch",
  async (_, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      const response = await axios.get(`${API_URL}/payment-modes`, { headers: { Authorization: `Bearer ${token}` } });
      return response.data.data.modes;
    } catch (error) {
      if (isAxiosError(error)) { return rejectWithValue(error.response?.data?.message || "Failed to fetch payment modes"); }
      return rejectWithValue("An unexpected error occurred.");
    }
  }
);

const paymentModeMasterSlice = createSlice({
  name: "paymentModes",
  initialState,
  reducers: {},
  extraReducers: (builder) => { builder.addCase(fetchPaymentModes.pending, (state) => { state.isLoading = true; }).addCase(fetchPaymentModes.fulfilled, (state, action) => { state.isLoading = false; state.paymentModes = action.payload; }).addCase(fetchPaymentModes.rejected, (state, action) => { state.isLoading = false; state.error = action.payload ?? "Failed to fetch"; }); },
});

export default paymentModeMasterSlice.reducer;