import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import {
  getFamilyHistoriesApi,
  getFamilyHistoryApi,
  getFamilyHistoriesByMemberApi,
  createFamilyHistoryApi,
  updateFamilyHistoryApi,
  deleteFamilyHistoryApi,
  getCustomerByGroupCodeApi,
} from "./services/familyHistoryApi";
import { getCustomerApi } from "./services/customerApi";

export interface FamilyHistoryRecordItem {
  id?: string;
  relation: string;
  age: number;
  stateOfHealth: string;
  isDead: boolean;
  ageAtDeath?: number | null;
  causeOfDeath?: string | null;
}

export interface FamilyHistoryItem {
  id: string;
  groupId: string;
  memberId: string;
  date: string;
  createdAt: string;
  updatedAt: string;
  group: {
    groupCode: string;
    groupName: string | null;
    name: string;
  };
  member: {
    firstName: string;
    middleName?: string | null;
    lastName: string;
    salutation?: string | null;
  };
  records?: FamilyHistoryRecordItem[];
}

export interface FamilyHistoryState {
  records: FamilyHistoryItem[];
  currentRecord: FamilyHistoryItem | null;
  isLoading: boolean;
  error: string | null;
  // Group Code lookup
  currentGroup: {
    id: string;
    name: string;
    groupName?: string | null;
    groupCode?: string | null;
    members: Array<{
      id: string;
      firstName: string;
      middleName?: string | null;
      lastName: string;
      salutation?: string | null;
    }>;
  } | null;
  isGroupLoading: boolean;
  groupError: string | null;
}

const initialState: FamilyHistoryState = {
  records: [],
  currentRecord: null,
  isLoading: false,
  error: null,
  currentGroup: null,
  isGroupLoading: false,
  groupError: null,
};

export const fetchFamilyHistoriesByMember = createAsyncThunk(
  "familyHistory/fetchByMember",
  async (memberId: string, { rejectWithValue }) => {
    try {
      const data = await getFamilyHistoriesByMemberApi(memberId);
      return (data.data.records ?? []) as FamilyHistoryItem[];
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message ?? "Failed to fetch family history records");
    }
  }
);

export const fetchFamilyHistory = createAsyncThunk(
  "familyHistory/fetchOne",
  async (id: string, { rejectWithValue }) => {
    try {
      const data = await getFamilyHistoryApi(id);
      return data.data.record;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message ?? "Failed to fetch family history details");
    }
  }
);

export const createFamilyHistory = createAsyncThunk(
  "familyHistory/create",
  async (payload: any, { rejectWithValue }) => {
    try {
      const data = await createFamilyHistoryApi(payload);
      return data.data.record;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message ?? "Failed to create family history");
    }
  }
);

export const updateFamilyHistory = createAsyncThunk(
  "familyHistory/update",
  async ({ id, payload }: { id: string; payload: any }, { rejectWithValue }) => {
    try {
      const data = await updateFamilyHistoryApi(id, payload);
      return data.data.record;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message ?? "Failed to update family history");
    }
  }
);

export const deleteFamilyHistory = createAsyncThunk(
  "familyHistory/delete",
  async (id: string, { rejectWithValue }) => {
    try {
      await deleteFamilyHistoryApi(id);
      return id;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message ?? "Failed to delete family history");
    }
  }
);

export const fetchGroupByCode = createAsyncThunk(
  "familyHistory/fetchGroupByCode",
  async (groupCode: string, { rejectWithValue }) => {
    try {
      const data = await getCustomerByGroupCodeApi(groupCode);
      return data.data.customer;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message ?? "Failed to find group code");
    }
  }
);

export const fetchGroupById = createAsyncThunk(
  "familyHistory/fetchGroupById",
  async (id: string, { rejectWithValue }) => {
    try {
      const data = await getCustomerApi(id);
      return data.data.customer;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message ?? "Failed to find group");
    }
  }
);

const familyHistorySlice = createSlice({
  name: "familyHistory",
  initialState,
  reducers: {
    clearCurrentRecord: (state) => {
      state.currentRecord = null;
    },
    clearFamilyRecords: (state) => {
      state.records = [];
      state.error = null;
    },
    clearCurrentGroup: (state) => {
      state.currentGroup = null;
      state.groupError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch by Member
      .addCase(fetchFamilyHistoriesByMember.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchFamilyHistoriesByMember.fulfilled, (state, action: PayloadAction<FamilyHistoryItem[]>) => {
        state.isLoading = false;
        state.records = action.payload;
      })
      .addCase(fetchFamilyHistoriesByMember.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch One
      .addCase(fetchFamilyHistory.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchFamilyHistory.fulfilled, (state, action: PayloadAction<FamilyHistoryItem>) => {
        state.isLoading = false;
        state.currentRecord = action.payload;
      })
      .addCase(fetchFamilyHistory.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Create — replace by id if it already exists, otherwise prepend
      .addCase(createFamilyHistory.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createFamilyHistory.fulfilled, (state, action: PayloadAction<FamilyHistoryItem>) => {
        state.isLoading = false;
        const idx = state.records.findIndex((r) => r.id === action.payload.id);
        if (idx !== -1) state.records[idx] = action.payload;
        else state.records.unshift(action.payload);
      })
      .addCase(createFamilyHistory.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Update — replace by id
      .addCase(updateFamilyHistory.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateFamilyHistory.fulfilled, (state, action: PayloadAction<FamilyHistoryItem>) => {
        state.isLoading = false;
        const idx = state.records.findIndex((r) => r.id === action.payload.id);
        if (idx !== -1) state.records[idx] = action.payload;
        if (state.currentRecord?.id === action.payload.id) state.currentRecord = action.payload;
      })
      .addCase(updateFamilyHistory.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Delete
      .addCase(deleteFamilyHistory.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteFamilyHistory.fulfilled, (state, action: PayloadAction<string>) => {
        state.isLoading = false;
        state.records = state.records.filter((r) => r.id !== action.payload);
        if (state.currentRecord?.id === action.payload) state.currentRecord = null;
      })
      .addCase(deleteFamilyHistory.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch Group by Code
      .addCase(fetchGroupByCode.pending, (state) => {
        state.isGroupLoading = true;
        state.groupError = null;
        state.currentGroup = null;
      })
      .addCase(fetchGroupByCode.fulfilled, (state, action: PayloadAction<any>) => {
        state.isGroupLoading = false;
        state.currentGroup = action.payload;
      })
      .addCase(fetchGroupByCode.rejected, (state, action) => {
        state.isGroupLoading = false;
        state.groupError = action.payload as string;
      })
      // Fetch Group by ID
      .addCase(fetchGroupById.pending, (state) => {
        state.isGroupLoading = true;
        state.groupError = null;
        state.currentGroup = null;
      })
      .addCase(fetchGroupById.fulfilled, (state, action: PayloadAction<any>) => {
        state.isGroupLoading = false;
        state.currentGroup = action.payload;
      })
      .addCase(fetchGroupById.rejected, (state, action) => {
        state.isGroupLoading = false;
        state.groupError = action.payload as string;
      });
  },
});

export const { clearCurrentRecord, clearFamilyRecords, clearCurrentGroup } = familyHistorySlice.actions;
export default familyHistorySlice.reducer;
