import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import {
  getClientsApi,
  getClientApi,
  createClientApi,
  updateClientApi,
  deleteClientApi,
  loginClientApi,
} from "./services/clientApi";
import type { ClientState, ClientPayload, ClientUpdatePayload } from "./types";

const portalPersistKey = "clientPortalToken";
const portalUserKey = "clientPortalUser";

const initialState: ClientState = {
  clients: [],
  currentClient: null,
  portalClient:
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem(portalUserKey) ?? "null")
      : null,
  portalToken:
    typeof window !== "undefined" ? localStorage.getItem(portalPersistKey) : null,
  isLoading: false,
  error: null,
};

// Thunks
export const fetchClients = createAsyncThunk("clients/fetchAll", async (_, { rejectWithValue }) => {
  try {
    const data = await getClientsApi();
    return data.data.clients;
  } catch (err: any) {
    return rejectWithValue(err.response?.data?.message ?? "Failed to fetch clients");
  }
});

export const fetchClient = createAsyncThunk(
  "clients/fetchOne",
  async (id: string, { rejectWithValue }) => {
    try {
      const data = await getClientApi(id);
      return data.data.client;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message ?? "Failed to fetch client");
    }
  }
);

export const createClient = createAsyncThunk(
  "clients/create",
  async (payload: ClientPayload, { rejectWithValue }) => {
    try {
      const data = await createClientApi(payload);
      return data.data.client;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message ?? "Failed to create client");
    }
  }
);

export const updateClient = createAsyncThunk(
  "clients/update",
  async ({ id, payload }: { id: string; payload: ClientUpdatePayload }, { rejectWithValue }) => {
    try {
      const data = await updateClientApi(id, payload);
      return data.data.client;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message ?? "Failed to update client");
    }
  }
);

export const deleteClient = createAsyncThunk(
  "clients/delete",
  async (id: string, { rejectWithValue }) => {
    try {
      await deleteClientApi(id);
      return id;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message ?? "Failed to delete client");
    }
  }
);

export const loginPortalClient = createAsyncThunk(
  "clients/portalLogin",
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const data = await loginClientApi(email, password);
      if (typeof window !== "undefined") {
        localStorage.setItem(portalPersistKey, data.token);
        localStorage.setItem(portalUserKey, JSON.stringify(data.data.client));
        document.cookie = `clientPortalToken=${data.token}; path=/; max-age=${60 * 60 * 24 * 7}`;
        document.cookie = `clientPortalUser=${JSON.stringify(data.data.client)}; path=/; max-age=${60 * 60 * 24 * 7}`;
      }
      return data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message ?? "Invalid credentials");
    }
  }
);

const clientSlice = createSlice({
  name: "clients",
  initialState,
  reducers: {
    clearClientError(state) {
      state.error = null;
    },
    logoutPortalClient(state) {
      state.portalClient = null;
      state.portalToken = null;
      if (typeof window !== "undefined") {
        localStorage.removeItem(portalPersistKey);
        localStorage.removeItem(portalUserKey);
        document.cookie = "clientPortalToken=; path=/; max-age=0";
        document.cookie = "clientPortalUser=; path=/; max-age=0";
      }
    },
  },
  extraReducers: (builder) => {
    // fetchClients
    builder
      .addCase(fetchClients.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(fetchClients.fulfilled, (state, action) => { state.isLoading = false; state.clients = action.payload; })
      .addCase(fetchClients.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string; });

    // fetchClient
    builder
      .addCase(fetchClient.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(fetchClient.fulfilled, (state, action) => { state.isLoading = false; state.currentClient = action.payload; })
      .addCase(fetchClient.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string; });

    // createClient
    builder
      .addCase(createClient.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(createClient.fulfilled, (state, action) => { state.isLoading = false; state.clients.unshift(action.payload); })
      .addCase(createClient.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string; });

    // updateClient
    builder
      .addCase(updateClient.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(updateClient.fulfilled, (state, action) => {
        state.isLoading = false;
        const idx = state.clients.findIndex((c) => c.id === action.payload.id);
        if (idx !== -1) state.clients[idx] = action.payload;
        state.currentClient = action.payload;
      })
      .addCase(updateClient.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string; });

    // deleteClient
    builder
      .addCase(deleteClient.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(deleteClient.fulfilled, (state, action) => {
        state.isLoading = false;
        state.clients = state.clients.filter((c) => c.id !== action.payload);
      })
      .addCase(deleteClient.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string; });

    // portalLogin
    builder
      .addCase(loginPortalClient.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(loginPortalClient.fulfilled, (state, action) => {
        state.isLoading = false;
        state.portalClient = action.payload.data.client;
        state.portalToken = action.payload.token;
      })
      .addCase(loginPortalClient.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string; });
  },
});

export const { clearClientError, logoutPortalClient } = clientSlice.actions;
export default clientSlice.reducer;
