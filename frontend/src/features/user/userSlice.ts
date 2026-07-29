import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  getAllUsersApi,
  getUserByIdApi,
  createUserApi,
  updateUserApi,
  deleteUserApi,
  resetUserPasswordApi,
} from "./userApi";
import type {
  UserManagementState,
  CreateUserPayload,
  UpdateUserPayload,
  ResetPasswordPayload,
} from "./types";

const initialState: UserManagementState = {
  users: [],
  currentUser: null,
  isLoading: false,
  error: null,
};

export const fetchAllUsers = createAsyncThunk(
  "userManagement/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const data = await getAllUsersApi();
      return data.data.users;
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.message ?? "Failed to fetch users",
      );
    }
  },
);

export const fetchUserById = createAsyncThunk(
  "userManagement/fetchOne",
  async (id: string, { rejectWithValue }) => {
    try {
      const data = await getUserByIdApi(id);
      return data.data.user;
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.message ?? "Failed to fetch user",
      );
    }
  },
);

export const createUser = createAsyncThunk(
  "userManagement/create",
  async (payload: CreateUserPayload, { rejectWithValue }) => {
    try {
      const data = await createUserApi(payload);
      return data.data.user;
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.message ?? "Failed to create user",
      );
    }
  },
);

export const updateUser = createAsyncThunk(
  "userManagement/update",
  async (
    { id, payload }: { id: string; payload: UpdateUserPayload },
    { rejectWithValue },
  ) => {
    try {
      const data = await updateUserApi(id, payload);
      return data.data.user;
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.message ?? "Failed to update user",
      );
    }
  },
);

export const deleteUser = createAsyncThunk(
  "userManagement/delete",
  async (id: string, { rejectWithValue }) => {
    try {
      await deleteUserApi(id);
      return id;
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.message ?? "Failed to delete user",
      );
    }
  },
);

export const resetUserPassword = createAsyncThunk(
  "userManagement/resetPassword",
  async (
    { id, payload }: { id: string; payload: ResetPasswordPayload },
    { rejectWithValue },
  ) => {
    try {
      await resetUserPasswordApi(id, payload);
      return id;
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.message ?? "Failed to reset password",
      );
    }
  },
);

const userManagementSlice = createSlice({
  name: "userManagement",
  initialState,
  reducers: {
    clearUserError(state) {
      state.error = null;
    },
    clearCurrentUser(state) {
      state.currentUser = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllUsers.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAllUsers.fulfilled, (state, action) => {
        state.isLoading = false;
        state.users = action.payload;
      })
      .addCase(fetchAllUsers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    builder
      .addCase(fetchUserById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchUserById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentUser = action.payload;
      })
      .addCase(fetchUserById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    builder
      .addCase(createUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.users.unshift(action.payload);
      })
      .addCase(createUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    builder
      .addCase(updateUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        state.isLoading = false;
        const idx = state.users.findIndex((u) => u.id === action.payload.id);
        if (idx !== -1) state.users[idx] = action.payload;
        state.currentUser = action.payload;
      })
      .addCase(updateUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    builder
      .addCase(deleteUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.users = state.users.filter((u) => u.id !== action.payload);
      })
      .addCase(deleteUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    builder
      .addCase(resetUserPassword.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(resetUserPassword.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(resetUserPassword.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearUserError, clearCurrentUser } = userManagementSlice.actions;
export default userManagementSlice.reducer;
