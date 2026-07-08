import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios, { isAxiosError } from "axios";
import type { RootState } from "@/store/store";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export interface Advisor {
  id: string;
  advisorName: string;
  advisorCode: string;
  agencyId?: string | null;
}

interface AdvisorState {
  advisors: Advisor[];
  isLoading: boolean;
  error: string | null;
}

const initialState: AdvisorState = {
  advisors: [],
  isLoading: false,
  error: null,
};

export const fetchAdvisors = createAsyncThunk<
  Advisor[],
  void,
  { rejectValue: string; state: RootState }
>("advisors/fetchAdvisors", async (_, { getState, rejectWithValue }) => {
  try {
    const token = getState().auth.token;
    const config = {
      headers: { Authorization: `Bearer ${token}` },
    };
    const response = await axios.get(`${API_URL}/advisors`, config);
    return response.data.data.advisors;
  } catch (error) {
    if (isAxiosError(error)) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch advisors",
      );
    }
    return rejectWithValue(
      "An unexpected error occurred while fetching advisors.",
    );
  }
});

const advisorSlice = createSlice({
  name: "advisors",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdvisors.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAdvisors.fulfilled, (state, action) => {
        state.isLoading = false;
        state.advisors = action.payload;
      })
      .addCase(fetchAdvisors.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Failed to fetch advisors";
      });
  },
});

export default advisorSlice.reducer;
