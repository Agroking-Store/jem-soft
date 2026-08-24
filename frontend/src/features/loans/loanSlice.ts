import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios, { isAxiosError } from "axios";
import type { RootState } from "@/store/store";

/* ── Types ─────────────────────────────────────────────── */

export interface LoanRepaymentRecord {
  id: string;
  loanId: string;
  repaymentDate: string;
  repaymentAmount: number;
  principalComponent: number;
  interestComponent: number;
  paymentMode: string;
  referenceNumber: string | null;
  remarks: string | null;
  createdAt: string;
}

export interface LoanSummary {
  totalRepaid: number;
  totalPrincipalRepaid: number;
  totalInterestPaid: number;
  outstandingPrincipal: number;
  accruedInterest: number;
  totalDue: number;
}

export interface Loan {
  id: string;
  policyId: string;
  loanAmount: number;
  interestRate: number;
  loanDate: string;
  remarks: string | null;
  loanStatusId: string;
  createdAt: string;
  updatedAt: string;
  policy: {
    policyNumber: string;
    commencementDate?: string;
    CustomerMaster: {
      firstName: string;
      lastName: string;
    } | null;
    premium?: {
      sumAssured: number;
    } | null;
  } | null;
  loanStatus: {
    statusName: string;
    statusCode: string;
  } | null;
  repayments?: LoanRepaymentRecord[];
  summary?: LoanSummary;
}

export interface LoanInput {
  policyId: string;
  loanAmount: number;
  interestRate: number;
  loanDate: string;
  loanStatusId: string;
  remarks?: string;
}

interface LoanState {
  loans: Loan[];
  selectedLoan: Loan | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: LoanState = {
  loans: [],
  selectedLoan: null,
  isLoading: false,
  error: null,
};

/* ── API ──────────────────────────────────────────────── */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/* ── Thunks ───────────────────────────────────────────── */

export const fetchLoans = createAsyncThunk<
  Loan[],
  void,
  { rejectValue: string }
>("loans/fetchAll", async (_, { rejectWithValue }) => {
  try {
    const res = await api.get("/loans");
    return res.data.data;
  } catch (err) {
    if (isAxiosError(err))
      return rejectWithValue(
        err.response?.data?.message ?? "Failed to fetch loans",
      );
    return rejectWithValue("Unexpected error.");
  }
});

export const fetchLoanById = createAsyncThunk<
  Loan,
  string,
  { rejectValue: string }
>("loans/fetchById", async (id, { rejectWithValue }) => {
  try {
    const res = await api.get(`/loans/${id}`);
    return res.data.data;
  } catch (err) {
    if (isAxiosError(err))
      return rejectWithValue(
        err.response?.data?.message ?? "Failed to fetch loan",
      );
    return rejectWithValue("Unexpected error.");
  }
});

export const createLoan = createAsyncThunk<
  Loan,
  LoanInput,
  { rejectValue: string }
>("loans/create", async (data, { rejectWithValue }) => {
  try {
    const res = await api.post("/loans", data);
    return res.data.data;
  } catch (err) {
    if (isAxiosError(err))
      return rejectWithValue(
        err.response?.data?.message ?? "Failed to create loan",
      );
    return rejectWithValue("Unexpected error.");
  }
});

export const updateLoan = createAsyncThunk<
  Loan,
  { id: string; data: Partial<LoanInput> },
  { rejectValue: string }
>("loans/update", async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await api.put(`/loans/${id}`, data);
    return res.data.data;
  } catch (err) {
    if (isAxiosError(err))
      return rejectWithValue(
        err.response?.data?.message ?? "Failed to update loan",
      );
    return rejectWithValue("Unexpected error.");
  }
});

export const deleteLoan = createAsyncThunk<
  { id: string; policyNumber: string },
  string,
  { state: RootState; rejectValue: string }
>("loans/delete", async (id, { getState, rejectWithValue }) => {
  try {
    const loan = (getState() as RootState).loans.loans.find((l) => l.id === id);
    await api.delete(`/loans/${id}`);
    return { id, policyNumber: loan?.policy?.policyNumber ?? "Unknown" };
  } catch (err) {
    if (isAxiosError(err))
      return rejectWithValue(
        err.response?.data?.message ?? "Failed to delete loan",
      );
    return rejectWithValue("Unexpected error.");
  }
});

/* ── Slice ────────────────────────────────────────────── */

const loanSlice = createSlice({
  name: "loans",
  initialState,
  reducers: {
    clearSelectedLoan: (state) => {
      state.selectedLoan = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchLoans.pending, (s) => {
        s.isLoading = true;
        s.error = null;
      })
      .addCase(fetchLoans.fulfilled, (s, a) => {
        s.isLoading = false;
        s.loans = a.payload;
      })
      .addCase(fetchLoans.rejected, (s, a) => {
        s.isLoading = false;
        s.error = a.payload ?? "Error";
      })

      .addCase(fetchLoanById.pending, (s) => {
        s.isLoading = true;
        s.error = null;
      })
      .addCase(fetchLoanById.fulfilled, (s, a) => {
        s.isLoading = false;
        s.selectedLoan = a.payload;
      })
      .addCase(fetchLoanById.rejected, (s, a) => {
        s.isLoading = false;
        s.error = a.payload ?? "Error";
      })

      .addCase(createLoan.pending, (s) => {
        s.isLoading = true;
        s.error = null;
      })
      .addCase(createLoan.fulfilled, (s, a) => {
        s.isLoading = false;
        s.loans.unshift(a.payload);
      })
      .addCase(createLoan.rejected, (s, a) => {
        s.isLoading = false;
        s.error = a.payload ?? "Error";
      })

      .addCase(updateLoan.pending, (s) => {
        s.isLoading = true;
        s.error = null;
      })
      .addCase(updateLoan.fulfilled, (s, a) => {
        s.isLoading = false;
        const idx = s.loans.findIndex((l) => l.id === a.payload.id);
        if (idx !== -1) s.loans[idx] = a.payload;
        s.selectedLoan = a.payload;
      })
      .addCase(updateLoan.rejected, (s, a) => {
        s.isLoading = false;
        s.error = a.payload ?? "Error";
      })

      .addCase(deleteLoan.fulfilled, (s, a) => {
        s.loans = s.loans.filter((l) => l.id !== a.payload.id);
      })
      .addCase(deleteLoan.rejected, (s, a) => {
        s.isLoading = false;
        s.error = a.payload ?? "Error";
      });
  },
});

export const { clearSelectedLoan } = loanSlice.actions;
export default loanSlice.reducer;
