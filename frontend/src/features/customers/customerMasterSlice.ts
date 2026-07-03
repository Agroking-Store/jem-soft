import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  getCustomersMasterApi,
  getCustomerMasterApi,
  createCustomerMasterApi,
  updateCustomerMasterApi,
  deleteCustomerMasterApi,
} from "./services/customerMasterApi";
import type { CustomerMasterState, CustomerMasterPayload } from "./types";

const initialState: CustomerMasterState = {
  customers: [],
  currentCustomer: null,
  isLoading: false,
  error: null,
};

export const fetchCustomersMaster = createAsyncThunk(
  "customerMaster/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const data = await getCustomersMasterApi();
      return data.data.customers;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message ?? "Failed to fetch customers");
    }
  }
);

export const fetchCustomerMaster = createAsyncThunk(
  "customerMaster/fetchOne",
  async (id: string, { rejectWithValue }) => {
    try {
      const data = await getCustomerMasterApi(id);
      return data.data.customer;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message ?? "Failed to fetch customer");
    }
  }
);

export const createCustomerMaster = createAsyncThunk(
  "customerMaster/create",
  async (payload: CustomerMasterPayload, { rejectWithValue }) => {
    try {
      const data = await createCustomerMasterApi(payload);
      return data.data.customer;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message ?? "Failed to create customer");
    }
  }
);

export const updateCustomerMaster = createAsyncThunk(
  "customerMaster/update",
  async ({ id, payload }: { id: string; payload: CustomerMasterPayload }, { rejectWithValue }) => {
    try {
      const data = await updateCustomerMasterApi(id, payload);
      return data.data.customer;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message ?? "Failed to update customer");
    }
  }
);

export const deleteCustomerMaster = createAsyncThunk(
  "customerMaster/delete",
  async (id: string, { rejectWithValue }) => {
    try {
      await deleteCustomerMasterApi(id);
      return id;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message ?? "Failed to delete customer");
    }
  }
);

const customerMasterSlice = createSlice({
  name: "customerMaster",
  initialState,
  reducers: {
    clearCustomerMasterError(state) {
      state.error = null;
    },
    clearCurrentCustomerMaster(state) {
      state.currentCustomer = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCustomersMaster.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(fetchCustomersMaster.fulfilled, (state, action) => { state.isLoading = false; state.customers = action.payload; })
      .addCase(fetchCustomersMaster.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string; });

    builder
      .addCase(fetchCustomerMaster.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(fetchCustomerMaster.fulfilled, (state, action) => { state.isLoading = false; state.currentCustomer = action.payload; })
      .addCase(fetchCustomerMaster.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string; });

    builder
      .addCase(createCustomerMaster.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(createCustomerMaster.fulfilled, (state, action) => { state.isLoading = false; state.customers.unshift(action.payload); })
      .addCase(createCustomerMaster.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string; });

    builder
      .addCase(updateCustomerMaster.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(updateCustomerMaster.fulfilled, (state, action) => {
        state.isLoading = false;
        const idx = state.customers.findIndex((c) => c.id === action.payload.id);
        if (idx !== -1) state.customers[idx] = action.payload;
        state.currentCustomer = action.payload;
      })
      .addCase(updateCustomerMaster.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string; });

    builder
      .addCase(deleteCustomerMaster.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(deleteCustomerMaster.fulfilled, (state, action) => {
        state.isLoading = false;
        state.customers = state.customers.filter((c) => c.id !== action.payload);
      })
      .addCase(deleteCustomerMaster.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string; });
  },
});

export const { clearCustomerMasterError, clearCurrentCustomerMaster } = customerMasterSlice.actions;
export default customerMasterSlice.reducer;
