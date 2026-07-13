import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios, { isAxiosError } from "axios";
import type { RootState } from "@/store/store";

export interface Loan {
  id: string;
  policyId: string;
  loanNumber?: string | null;
  loanAmount: number;
  interestRate?: number | null;
  loanDate: string;
  loanStatusId: string;
  createdAt: string;
  updatedAt: string;
  policy?: {
    policyNumber: string;
    CustomerMaster?: {
      firstName: string;
      lastName: string;
    } | null;
  } | null;
  loanStatus?: {
    statusName: string;
    statusCode: string;
  } | null;
}

export interface LoanInput {
  policyId: string;
  loanNumber?: string;
  loanAmount: number;
  interestRate?: number;
  loanDate: string;
  loanStatusId: string;
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

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export const fetchLoans = createAsyncThunk<
  Loan[],
  void,
  { rejectValue: string }
>("loans/fetchAll", async (_, { rejectWithValue }) => {
  try {
    const response = await api.get("/loans");
    return response.data.data;
  } catch (err) {
    if (isAxiosError(err)) {
      return rejectWithValue(
        err.response?.data?.message ?? "Failed to fetch loans",
      );
    }
    return rejectWithValue("Unexpected error while fetching loans.");
  }
});

export const fetchLoanById = createAsyncThunk<
  Loan,
  string,
  { rejectValue: string }
>("loans/fetchById", async (id, { rejectWithValue }) => {
  try {
    const response = await api.get(`/loans/${id}`);
    return response.data.data;
  } catch (err) {
    if (isAxiosError(err)) {
      return rejectWithValue(
        err.response?.data?.message ?? "Failed to fetch loan",
      );
    }
    return rejectWithValue("Unexpected error while fetching loan.");
  }
});

export const createLoan = createAsyncThunk<
  Loan,
  LoanInput,
  { rejectValue: string }
>("loans/create", async (loanData, { rejectWithValue }) => {
  try {
    const response = await api.post("/loans", loanData);
    return response.data.data;
  } catch (err) {
    if (isAxiosError(err)) {
      return rejectWithValue(
        err.response?.data?.message ?? "Failed to create loan",
      );
    }
    return rejectWithValue("Unexpected error while creating loan.");
  }
});

export const updateLoan = createAsyncThunk<
  Loan,
  { id: string; data: Partial<LoanInput> },
  { rejectValue: string }
>("loans/update", async ({ id, data }, { rejectWithValue }) => {
  try {
    const response = await api.put(`/loans/${id}`, data);
    return response.data.data;
  } catch (err) {
    if (isAxiosError(err)) {
      return rejectWithValue(
        err.response?.data?.message ?? "Failed to update loan",
      );
    }
    return rejectWithValue("Unexpected error while updating loan.");
  }
});

export const deleteLoan = createAsyncThunk<
  { id: string; loanNumber: string },
  string,
  { state: RootState; rejectValue: string }
>("loans/delete", async (id, { getState, rejectWithValue }) => {
  try {
    const loanToDelete = (getState() as RootState).loans.loans.find(
      (l) => l.id === id,
    );
    await api.delete(`/loans/${id}`);
    return { id, loanNumber: loanToDelete?.loanNumber ?? "Unknown" };
  } catch (err) {
    if (isAxiosError(err)) {
      return rejectWithValue(
        err.response?.data?.message ?? "Failed to delete loan",
      );
    }
    return rejectWithValue("Unexpected error while deleting loan.");
  }
});

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
      // Fetch all
      .addCase(fetchLoans.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchLoans.fulfilled, (state, action) => {
        state.isLoading = false;
        state.loans = action.payload;
      })
      .addCase(fetchLoans.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? "Failed to fetch loans";
      })

      // Fetch one
      .addCase(fetchLoanById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchLoanById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selectedLoan = action.payload;
      })
      .addCase(fetchLoanById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? "Failed to fetch loan";
      })

      // Create
      .addCase(createLoan.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createLoan.fulfilled, (state, action) => {
        state.isLoading = false;
        state.loans.push(action.payload);
      })
      .addCase(createLoan.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? "Failed to create loan";
      })

      // Update
      .addCase(updateLoan.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateLoan.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.loans.findIndex(
          (loan) => loan.id === action.payload.id,
        );
        if (index !== -1) {
          state.loans[index] = action.payload;
        }
        state.selectedLoan = action.payload;
      })
      .addCase(updateLoan.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? "Failed to update loan";
      })

      // Delete
      .addCase(deleteLoan.fulfilled, (state, action) => {
        state.isLoading = false;
        state.loans = state.loans.filter((l) => l.id !== action.payload.id);
      })
      .addCase(deleteLoan.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? "Failed to delete loan";
      });
  },
});

export const { clearSelectedLoan } = loanSlice.actions;
export const selectSelectedLoan = (state: RootState) => state.loans.selectedLoan;
export default loanSlice.reducer;