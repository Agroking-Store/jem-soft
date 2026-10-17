import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import {
  getCustomersApi,
  getCustomerApi,
  createCustomerApi,
  updateCustomerApi,
  deleteCustomerApi,
  loginCustomerApi,
} from "./services/customerApi";
import type { CustomerState, CustomerPayload, CustomerUpdatePayload } from "./types";

const portalPersistKey = "customerPortalToken";
const portalUserKey = "customerPortalUser";

const initialState: CustomerState = {
  customers: [],
  currentCustomer: null,
  portalCustomer:
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem(portalUserKey) ?? "null")
      : null,
  portalToken:
    typeof window !== "undefined" ? localStorage.getItem(portalPersistKey) : null,
  isLoading: false,
  error: null,
};

// Thunks
export const fetchCustomers = createAsyncThunk("customers/fetchAll", async (_, { rejectWithValue }) => {
  try {
    const data = await getCustomersApi();
    return data.data.customers;
  } catch (err: any) {
    return rejectWithValue(err.response?.data?.message ?? "Failed to fetch customers");
  }
});

export const fetchCustomer = createAsyncThunk(
  "customers/fetchOne",
  async (id: string, { rejectWithValue }) => {
    try {
      const data = await getCustomerApi(id);
      return data.data.customer;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message ?? "Failed to fetch customer");
    }
  }
);

export const createCustomer = createAsyncThunk(
  "customers/create",
  async (payload: CustomerPayload, { rejectWithValue }) => {
    try {
      const data = await createCustomerApi(payload);
      return data.data.customer;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message ?? "Failed to create customer");
    }
  }
);

export const updateCustomer = createAsyncThunk(
  "customers/update",
  async ({ id, payload }: { id: string; payload: CustomerUpdatePayload }, { rejectWithValue }) => {
    try {
      const data = await updateCustomerApi(id, payload);
      return data.data.customer;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message ?? "Failed to update customer");
    }
  }
);

export const deleteCustomer = createAsyncThunk(
  "customers/delete",
  async (id: string, { rejectWithValue }) => {
    try {
      await deleteCustomerApi(id);
      return id;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message ?? "Failed to delete customer");
    }
  }
);

export const loginPortalCustomer = createAsyncThunk(
  "customers/portalLogin",
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const data = await loginCustomerApi(email, password);
      if (typeof window !== "undefined") {
        localStorage.setItem(portalPersistKey, data.token);
        localStorage.setItem(portalUserKey, JSON.stringify(data.data.customer));
        document.cookie = `customerPortalToken=${data.token}; path=/; max-age=${60 * 60 * 24 * 7}`;
        document.cookie = `customerPortalUser=${JSON.stringify(data.data.customer)}; path=/; max-age=${60 * 60 * 24 * 7}`;
      }
      return data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message ?? "Invalid credentials");
    }
  }
);

const customerSlice = createSlice({
  name: "customers",
  initialState,
  reducers: {
    clearCustomerError(state) {
      state.error = null;
    },
    logoutPortalCustomer(state) {
      state.portalCustomer = null;
      state.portalToken = null;
      if (typeof window !== "undefined") {
        localStorage.removeItem(portalPersistKey);
        localStorage.removeItem(portalUserKey);
        document.cookie = "customerPortalToken=; path=/; max-age=0";
        document.cookie = "customerPortalUser=; path=/; max-age=0";
      }
    },
  },
  extraReducers: (builder) => {
    // fetchCustomers
    builder
      .addCase(fetchCustomers.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(fetchCustomers.fulfilled, (state, action) => { state.isLoading = false; state.customers = action.payload; })
      .addCase(fetchCustomers.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string; });

    // fetchCustomer
    builder
      .addCase(fetchCustomer.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(fetchCustomer.fulfilled, (state, action) => { state.isLoading = false; state.currentCustomer = action.payload; })
      .addCase(fetchCustomer.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string; });

    // createCustomer
    builder
      .addCase(createCustomer.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(createCustomer.fulfilled, (state, action) => { state.isLoading = false; state.customers.unshift(action.payload); })
      .addCase(createCustomer.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string; });

    // updateCustomer
    builder
      .addCase(updateCustomer.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(updateCustomer.fulfilled, (state, action) => {
        state.isLoading = false;
        const idx = state.customers.findIndex((c) => c.id === action.payload.id);
        if (idx !== -1) state.customers[idx] = action.payload;
        state.currentCustomer = action.payload;
      })
      .addCase(updateCustomer.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string; });

    // deleteCustomer
    builder
      .addCase(deleteCustomer.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(deleteCustomer.fulfilled, (state, action) => {
        state.isLoading = false;
        state.customers = state.customers.filter((c) => c.id !== action.payload);
      })
      .addCase(deleteCustomer.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string; });

    // portalLogin
    builder
      .addCase(loginPortalCustomer.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(loginPortalCustomer.fulfilled, (state, action) => {
        state.isLoading = false;
        state.portalCustomer = action.payload.data.customer;
        state.portalToken = action.payload.token;
      })
      .addCase(loginPortalCustomer.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string; });
  },
});

export const { clearCustomerError, logoutPortalCustomer } = customerSlice.actions;
export default customerSlice.reducer;
