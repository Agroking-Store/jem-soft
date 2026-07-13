import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios, { isAxiosError } from "axios";

export interface LoanStatus {
  id: string;
  statusName: string;
  statusCode: string;
}

interface LoanStatusState {
  statuses: LoanStatus[];
  isLoading: boolean;
  error: string | null;
}

const initialState: LoanStatusState = {
  statuses: [],
  isLoading: false,
  error: null,
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const fetchLoanStatuses = createAsyncThunk<
  LoanStatus[],
  void,
  { rejectValue: string }
>("loanStatuses/fetchAll", async (_, { rejectWithValue }) => {
  try {
    const response = await api.get("/loan-statuses");
    return response.data.data;
  } catch (err) {
    if (isAxiosError(err)) {
      return rejectWithValue(
        err.response?.data?.message ?? "Failed to fetch loan statuses",
      );
    }
    return rejectWithValue("Unexpected error while fetching loan statuses.");
  }
});

const loanStatusMasterSlice = createSlice({
  name: "loanStatuses",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchLoanStatuses.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchLoanStatuses.fulfilled, (state, action) => {
        state.isLoading = false;
        state.statuses = action.payload;
      })
      .addCase(fetchLoanStatuses.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? "Failed to fetch loan statuses";
      });
  },
});

export default loanStatusMasterSlice.reducer;