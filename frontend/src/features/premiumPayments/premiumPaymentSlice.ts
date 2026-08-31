import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios, { isAxiosError } from "axios";
import type { RootState } from "@/store/store";

export interface PremiumPaymentStatus {
  id: string;
  statusCode: string;
  statusName: string;
}
export interface PremiumPaymentPolicy {
  id: string;
  policyNumber: string;
  commencementDate?: string | null;
  nextPremiumDueDate?: string | null;
  CustomerMaster?: {
    id: string;
    firstName: string;
    lastName?: string | null;
  } | null;
}
export interface PremiumPayment {
  id: string;
  policyId: string;
  installmentNo?: number | null;
  dueDate: string;
  paidDate: string;
  premiumAmount: number;
  lateFee?: number | null;
  paymentMode?: string | null;
  receiptNumber?: string | null;
  paymentStatusId: string;
  paymentStatus?: PremiumPaymentStatus | null;
  policy?: PremiumPaymentPolicy | null;
  createdAt?: string;
  updatedAt?: string;
}
export interface CreatePremiumPaymentInput {
  policyId: string;
  installmentNo?: number;
  dueDate: string;
  paidDate: string;
  premiumAmount: number;
  lateFee?: number | null;
  paymentMode?: string | null;
  paymentDetails?: string | null;
  paymentStatusId?: string;
  futureDueDate? : string;
}
interface State {
  payments: PremiumPayment[];
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
}
const initialState: State = {
  payments: [],
  isLoading: false,
  isSubmitting: false,
  error: null,
};
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
const api = axios.create({ baseURL: API_URL });
api.interceptors.request.use((c) => {
  if (typeof window !== "undefined") {
    const t = localStorage.getItem("token");
    if (t) c.headers.Authorization = `Bearer ${t}`;
  }
  return c;
});
const err = (e: unknown, f: string) =>
  isAxiosError(e) ? (e.response?.data?.message ?? f) : f;
export const fetchPremiumPayments = createAsyncThunk<
  PremiumPayment[],
  void,
  { rejectValue: string }
>("premiumPayments/fetchAll", async (_, { rejectWithValue }) => {
  try {
    return (await api.get("/premium-payments")).data.data.payments;
  } catch (e) {
    return rejectWithValue(err(e, "Failed to fetch premium payments"));
  }
});
export const fetchPremiumPaymentsByPolicy = createAsyncThunk<
  PremiumPayment[],
  string,
  { rejectValue: string }
>("premiumPayments/fetchByPolicy", async (id, { rejectWithValue }) => {
  try {
    return (await api.get(`/premium-payments/policy/${id}`)).data.data.payments;
  } catch (e) {
    return rejectWithValue(err(e, "Failed to fetch policy payments"));
  }
});
export const createPremiumPayment = createAsyncThunk<
  PremiumPayment,
  CreatePremiumPaymentInput,
  { rejectValue: string }
>("premiumPayments/create", async (data, { rejectWithValue }) => {
  try {
    return (await api.post("/premium-payments", data)).data.data.payment;
  } catch (e) {
    return rejectWithValue(err(e, "Failed to create premium payment"));
  }
});
const slice = createSlice({
  name: "premiumPayments",
  initialState,
  reducers: {
    clearPremiumPaymentError: (s) => {
      s.error = null;
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchPremiumPayments.pending, (s) => {
      s.isLoading = true;
      s.error = null;
    })
      .addCase(fetchPremiumPayments.fulfilled, (s, a) => {
        s.isLoading = false;
        s.payments = a.payload;
      })
      .addCase(fetchPremiumPayments.rejected, (s, a) => {
        s.isLoading = false;
        s.error = a.payload ?? "Failed to fetch premium payments";
      })
      .addCase(fetchPremiumPaymentsByPolicy.pending, (s) => {
        s.isLoading = true;
        s.error = null;
      })
      .addCase(fetchPremiumPaymentsByPolicy.fulfilled, (s, a) => {
        s.isLoading = false;
        s.payments = a.payload;
      })
      .addCase(fetchPremiumPaymentsByPolicy.rejected, (s, a) => {
        s.isLoading = false;
        s.error = a.payload ?? "Failed to fetch policy payments";
      })
      .addCase(createPremiumPayment.pending, (s) => {
        s.isSubmitting = true;
        s.error = null;
      })
      .addCase(createPremiumPayment.fulfilled, (s, a) => {
        s.isSubmitting = false;
        s.payments.push(a.payload);
      })
      .addCase(createPremiumPayment.rejected, (s, a) => {
        s.isSubmitting = false;
        s.error = a.payload ?? "Failed to create premium payment";
      });
  },
});
export const { clearPremiumPaymentError } = slice.actions;
export default slice.reducer;
export const selectPremiumPayments = (s: RootState) =>
  s.premiumPayments.payments;
