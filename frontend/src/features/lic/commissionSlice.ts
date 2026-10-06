import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios, { isAxiosError } from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface CommissionBillSummaryItem {
  id: string;
  billNumber: string;
  billDate: string;
  agencyId?: string;
  agencyName?: string;
  agencyCode?: string;
  billType: string;
  totalPremium: number;
  grossCommission: number;
  taxDeduction: number;
  netPayable: number;
  itemCount: number;
  fileName?: string;
  fileUrl?: string;
  createdAt: string;
}

export interface CommissionRecordItem {
  id: string;
  policyId?: string;
  policyNumber: string;
  policyHolderName?: string;
  groupCode?: string;
  advisorId?: string;
  advisorName?: string;
  agentCode?: string;
  agencyId?: string;
  agencyName?: string;
  billId?: string;
  billNumber?: string;
  billDate?: string;
  dueDate?: string;
  dateOfPayment?: string;
  premiumAmount: number;
  commissionAmount: number;
  commissionCode: number;
  commissionDate?: string;
  planTermPpt?: string;
  category: "first-comm" | "first-year" | "second-third" | "subsequent";
  recoveryCause?: string;
  status: "DUE" | "RECEIVED" | "SHORT" | "GAP";
  expectedAmount?: number;
  differenceAmount?: number;
  createdAt: string;
}

export interface CommissionForecastItem {
  policyId: string;
  policyNumber: string;
  clientName: string;
  dueDate: string;
  installmentPremium: number;
  policyYear: number;
  comCode: number;
  expectedCommission: number;
  planName: string;
  advisorName: string;
}

interface CommissionState {
  bills: CommissionBillSummaryItem[];
  currentBill: any | null;
  ledgerRecords: CommissionRecordItem[];
  ledgerSummary: {
    totalRecords: number;
    totalPremium: number;
    totalGross: number;
    totalTds: number;
    totalNet: number;
  } | null;
  forecast: {
    totalPoliciesDue: number;
    totalDuePremiums: number;
    totalForecastCommission: number;
    items: CommissionForecastItem[];
  } | null;
  discrepancies: {
    totalDiscrepancies: number;
    totalShortAmount: number;
    shortRecords: CommissionRecordItem[];
  } | null;
  isLoading: boolean;
  isUploading: boolean;
  error: string | null;
}

const initialState: CommissionState = {
  bills: [],
  currentBill: null,
  ledgerRecords: [],
  ledgerSummary: null,
  forecast: null,
  discrepancies: null,
  isLoading: false,
  isUploading: false,
  error: null,
};

// Async Thunks
export const fetchCommissionBills = createAsyncThunk(
  "commissions/fetchBills",
  async (agencyId: string | undefined, { rejectWithValue }) => {
    try {
      const url = agencyId ? `/commissions/bills?agencyId=${agencyId}` : `/commissions/bills`;
      const res = await api.get(url);
      return res.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch commission bills");
    }
  }
);

export const fetchCommissionBillById = createAsyncThunk(
  "commissions/fetchBillById",
  async (id: string, { rejectWithValue }) => {
    try {
      const res = await api.get(`/commissions/bills/${id}`);
      return res.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch bill details");
    }
  }
);

export const uploadCommissionBill = createAsyncThunk(
  "commissions/uploadBill",
  async (formData: FormData, { rejectWithValue }) => {
    try {
      const res = await api.post("/commissions/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || "Failed to process commission statement");
    }
  }
);

export const fetchCommissionLedger = createAsyncThunk(
  "commissions/fetchLedger",
  async (
    filters: {
      fromDate?: string;
      toDate?: string;
      agencyId?: string;
      policyNumber?: string;
      status?: string;
    } = {},
    { rejectWithValue }
  ) => {
    try {
      const params = new URLSearchParams();
      if (filters.fromDate) params.append("fromDate", filters.fromDate);
      if (filters.toDate) params.append("toDate", filters.toDate);
      if (filters.agencyId) params.append("agencyId", filters.agencyId);
      if (filters.policyNumber) params.append("policyNumber", filters.policyNumber);
      if (filters.status) params.append("status", filters.status);

      const res = await api.get(`/commissions/ledger?${params.toString()}`);
      return res.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch commission ledger");
    }
  }
);

export const fetchCommissionForecast = createAsyncThunk(
  "commissions/fetchForecast",
  async (days: number = 90, { rejectWithValue }) => {
    try {
      const res = await api.get(`/commissions/forecast?days=${days}`);
      return res.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch commission forecast");
    }
  }
);

export const fetchCommissionDiscrepancies = createAsyncThunk(
  "commissions/fetchDiscrepancies",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get("/commissions/discrepancies");
      return res.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch discrepancies");
    }
  }
);

export const deleteCommissionBill = createAsyncThunk(
  "commissions/deleteBill",
  async (id: string, { rejectWithValue }) => {
    try {
      await api.delete(`/commissions/bills/${id}`);
      return id;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || "Failed to delete bill");
    }
  }
);

const commissionSlice = createSlice({
  name: "commissions",
  initialState,
  reducers: {
    clearCurrentBill: (state) => {
      state.currentBill = null;
    },
  },
  extraReducers: (builder) => {
    // Bills
    builder.addCase(fetchCommissionBills.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchCommissionBills.fulfilled, (state, action) => {
      state.isLoading = false;
      state.bills = action.payload || [];
    });
    builder.addCase(fetchCommissionBills.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Bill by ID
    builder.addCase(fetchCommissionBillById.fulfilled, (state, action) => {
      state.currentBill = action.payload;
    });

    // Upload
    builder.addCase(uploadCommissionBill.pending, (state) => {
      state.isUploading = true;
      state.error = null;
    });
    builder.addCase(uploadCommissionBill.fulfilled, (state, action) => {
      state.isUploading = false;
      if (action.payload?.bill) {
        state.bills.unshift(action.payload.bill);
      }
    });
    builder.addCase(uploadCommissionBill.rejected, (state, action) => {
      state.isUploading = false;
      state.error = action.payload as string;
    });

    // Ledger
    builder.addCase(fetchCommissionLedger.fulfilled, (state, action) => {
      state.ledgerRecords = action.payload?.records || [];
      state.ledgerSummary = action.payload?.summary || null;
    });

    // Forecast
    builder.addCase(fetchCommissionForecast.fulfilled, (state, action) => {
      state.forecast = action.payload;
    });

    // Discrepancies
    builder.addCase(fetchCommissionDiscrepancies.fulfilled, (state, action) => {
      state.discrepancies = action.payload;
    });

    // Delete
    builder.addCase(deleteCommissionBill.fulfilled, (state, action) => {
      state.bills = state.bills.filter((b) => b.id !== action.payload);
      if (state.currentBill?.id === action.payload) {
        state.currentBill = null;
      }
    });
  },
});

export const { clearCurrentBill } = commissionSlice.actions;
export default commissionSlice.reducer;
