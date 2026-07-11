import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios, { isAxiosError } from "axios";
import type { RootState } from "@/store/store";

export interface LicBranch {
  id: string;
  branchCode: string;
  branchName: string;
}

interface LicBranchState {
  branches: LicBranch[];
  isLoading: boolean;
  error: string | null;
}

const initialState: LicBranchState = {
  branches: [],
  isLoading: false,
  error: null,
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export const fetchLicBranches = createAsyncThunk<
  LicBranch[],
  void,
  { rejectValue: string; state: RootState }
>("licBranches/fetchAll", async (_, { getState, rejectWithValue }) => {
  try {
    const token = getState().auth.token;
    const config = { headers: { Authorization: `Bearer ${token}` } };
    const response = await axios.get(`${API_URL}/lic-branches`, config);
    return response.data.data.branches;
  } catch (error) {
    if (isAxiosError(error)) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch LIC branches"
      );
    }
    return rejectWithValue("An unexpected error occurred");
  }
});

const licBranchSlice = createSlice({
  name: "licBranch",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchLicBranches.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchLicBranches.fulfilled, (state, action) => {
        state.isLoading = false;
        state.branches = action.payload;
      })
      .addCase(fetchLicBranches.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? "Failed to fetch LIC branches";
      });
  },
});

export default licBranchSlice.reducer;