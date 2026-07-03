import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import axios, { isAxiosError } from "axios";
import type { RootState } from "@/store/store";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export interface RiderMaster {
  id: string;
  riderName: string;
  riderCode?: string | null;
  description?: string | null;
}

interface RiderMasterState {
  riders: RiderMaster[];
  isLoading: boolean;
  error: string | null;
}

const initialState: RiderMasterState = {
  riders: [],
  isLoading: false,
  error: null,
};

export const fetchRiders = createAsyncThunk<RiderMaster[], void, { rejectValue: string; state: RootState }>(
  "riderMaster/fetchRiders",
  async (_, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      const config = {
        headers: { Authorization: `Bearer ${token}` },
      };
      const response = await axios.get(`${API_URL}/riders`, config);
      return response.data.data.riders;
    } catch (error) {
      if (isAxiosError(error)) {
        return rejectWithValue(error.response?.data?.message || "Failed to fetch riders");
      }
      return rejectWithValue("An unexpected error occurred while fetching riders.");
    }
  }
);

export const addNewRider = createAsyncThunk<RiderMaster, Omit<RiderMaster, "id">, { rejectValue: string; state: RootState }>(
  "riderMaster/addNewRider",
  async (newRider, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      const config = {
        headers: { Authorization: `Bearer ${token}` },
      };
      const response = await axios.post(`${API_URL}/riders`, newRider, config);
      return response.data.data.rider;
    } catch (error) {
      if (isAxiosError(error)) {
        return rejectWithValue(error.response?.data?.message || "Failed to create rider");
      }
      return rejectWithValue("An unexpected error occurred while creating the rider.");
    }
  }
);

export const updateExistingRider = createAsyncThunk<RiderMaster, { id: string; data: Partial<Omit<RiderMaster, "id">> }, { rejectValue: string; state: RootState }>(
  "riderMaster/updateExistingRider",
  async ({ id, data }, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      const config = {
        headers: { Authorization: `Bearer ${token}` },
      };
      const response = await axios.patch(`${API_URL}/riders/${id}`, data, config);
      return response.data.data.rider;
    } catch (error) {
      if (isAxiosError(error)) {
        return rejectWithValue(error.response?.data?.message || "Failed to update rider");
      }
      return rejectWithValue("An unexpected error occurred while updating the rider.");
    }
  }
);

export const deleteExistingRider = createAsyncThunk<string, string, { rejectValue: string; state: RootState }>(
  "riderMaster/deleteExistingRider",
  async (id: string, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      const config = {
        headers: { Authorization: `Bearer ${token}` },
      };
      await axios.delete(`${API_URL}/riders/${id}`, config);
      return id;
    } catch (error) {
      if (isAxiosError(error)) {
        return rejectWithValue(error.response?.data?.message || "Failed to delete rider");
      }
      return rejectWithValue("An unexpected error occurred while deleting the rider.");
    }
  }
);

const riderMasterSlice = createSlice({
  name: "riderMaster",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch Riders
      .addCase(fetchRiders.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(fetchRiders.fulfilled, (state, action) => { state.isLoading = false; state.riders = action.payload; })
      .addCase(fetchRiders.rejected, (state, action) => { state.isLoading = false; state.error = action.payload || "Failed to fetch riders"; })

      // Add New Rider
      .addCase(addNewRider.fulfilled, (state, action: PayloadAction<RiderMaster>) => {
        state.riders.push(action.payload);
      })
      .addCase(addNewRider.rejected, (state, action) => {
        state.error = action.payload || "Failed to create rider";
      })

      // Update Rider
      .addCase(updateExistingRider.fulfilled, (state, action: PayloadAction<RiderMaster>) => {
        const index = state.riders.findIndex((rider) => rider.id === action.payload.id);
        if (index !== -1) {
          state.riders[index] = action.payload;
        }
      })
      .addCase(updateExistingRider.rejected, (state, action) => {
        state.error = action.payload || "Failed to update rider";
      })

      // Delete Rider
      .addCase(deleteExistingRider.fulfilled, (state, action: PayloadAction<string>) => {
        state.riders = state.riders.filter((rider) => rider.id !== action.payload);
      })
      .addCase(deleteExistingRider.rejected, (state, action) => {
        state.error = action.payload || "Failed to delete rider";
      });
  },
});

export default riderMasterSlice.reducer;