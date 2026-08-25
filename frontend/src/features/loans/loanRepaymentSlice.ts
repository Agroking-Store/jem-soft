import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios, { isAxiosError } from "axios";
import type { LoanRepaymentRecord } from "./loanSlice";

export interface RepaymentInput {
  repaymentDate: string;
  repaymentAmount: number;
  paymentMode: string;
  referenceNumber?: string;
  remarks?: string;
}

interface RepaymentState {
  repayments: LoanRepaymentRecord[];
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
}

const initialState: RepaymentState = {
  repayments: [],
  isLoading: false,
  isSubmitting: false,
  error: null,
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
const api = axios.create({ baseURL: API_URL });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const fetchRepayments = createAsyncThunk<
  LoanRepaymentRecord[],
  string,
  { rejectValue: string }
>("repayments/fetchByLoan", async (loanId, { rejectWithValue }) => {
  try {
    const res = await api.get(`/loans/${loanId}/repayments`);
    return res.data.data;
  } catch (err) {
    if (isAxiosError(err))
      return rejectWithValue(
        err.response?.data?.message ?? "Failed to fetch repayments",
      );
    return rejectWithValue("Unexpected error.");
  }
});

export const createRepayment = createAsyncThunk<
  LoanRepaymentRecord,
  { loanId: string; data: RepaymentInput },
  { rejectValue: string }
>("repayments/create", async ({ loanId, data }, { rejectWithValue }) => {
  try {
    const res = await api.post(`/loans/${loanId}/repayments`, data);
    return res.data.data;
  } catch (err) {
    if (isAxiosError(err))
      return rejectWithValue(
        err.response?.data?.message ?? "Failed to create repayment",
      );
    return rejectWithValue("Unexpected error.");
  }
});

const loanRepaymentSlice = createSlice({
  name: "repayments",
  initialState,
  reducers: {
    clearRepayments: (state) => {
      state.repayments = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRepayments.pending, (s) => {
        s.isLoading = true;
      })
      .addCase(fetchRepayments.fulfilled, (s, a) => {
        s.isLoading = false;
        s.repayments = a.payload;
      })
      .addCase(fetchRepayments.rejected, (s, a) => {
        s.isLoading = false;
        s.error = a.payload ?? "Error";
      })

      .addCase(createRepayment.pending, (s) => {
        s.isSubmitting = true;
      })
      .addCase(createRepayment.fulfilled, (s, a) => {
        s.isSubmitting = false;
        s.repayments.unshift(a.payload);
      })
      .addCase(createRepayment.rejected, (s, a) => {
        s.isSubmitting = false;
        s.error = a.payload ?? "Error";
      });
  },
});

export const { clearRepayments } = loanRepaymentSlice.actions;
export default loanRepaymentSlice.reducer;
