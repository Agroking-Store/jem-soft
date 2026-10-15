import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import {
  getMedicalHistoriesByMemberApi,
  getMedicalHistoryApi,
  createMedicalHistoryApi,
  updateMedicalHistoryApi,
  deleteMedicalHistoryApi,
} from "./services/medicalHistoryApi";

export interface MedicalHistoryRecordItem {
  id?: string;
  // Basic details
  medicalHistoryDate?: string; // ISO date
  age?: number | null; // derived from member DOB, read-only
  gender?: string | null; // derived from member profile, read-only
  // Member's details
  bloodGroup: string; // A+, A-, B+, B-, AB+, AB-, O+, O-
  bloodPressure?: string | null; // mmHg
  pulse?: string | null; // bpm
  height?: number | null; // Cms
  weight?: number | null; // Kgs
  chest?: number | null; // Cms
  abdomen?: number | null; // Cms
  identificationMark?: string | null;
  spectaclesDetails?: string | null;
  dentalDetails?: string | null;
  // Examination details
  majorIllness?: string | null;
  operationAccident?: string | null;
  specialReport?: string | null;
  doctorName?: string | null;
  medicalExaminationDate?: string | null; // ISO date
}

export interface MedicalHistoryItem {
  id: string;
  memberId: string;
  date: string;
  createdAt: string;
  updatedAt: string;
  records?: MedicalHistoryRecordItem[];
}

export interface MedicalHistoryState {
  /** Records scoped to the member currently being viewed. */
  records: MedicalHistoryItem[];
  currentRecord: MedicalHistoryItem | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: MedicalHistoryState = {
  records: [],
  currentRecord: null,
  isLoading: false,
  error: null,
};

export const fetchMedicalHistoriesByMember = createAsyncThunk(
  "medicalHistory/fetchByMember",
  async (memberId: string, { rejectWithValue }) => {
    try {
      const data = await getMedicalHistoriesByMemberApi(memberId);
      return data.data.records as MedicalHistoryItem[];
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message ?? "Failed to fetch medical history records");
    }
  }
);

export const fetchMedicalHistory = createAsyncThunk(
  "medicalHistory/fetchOne",
  async (id: string, { rejectWithValue }) => {
    try {
      const data = await getMedicalHistoryApi(id);
      return data.data.record as MedicalHistoryItem;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message ?? "Failed to fetch medical history details");
    }
  }
);

export const createMedicalHistory = createAsyncThunk(
  "medicalHistory/create",
  async (payload: any, { rejectWithValue }) => {
    try {
      const data = await createMedicalHistoryApi(payload);
      return data.data.record as MedicalHistoryItem;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message ?? "Failed to create medical history");
    }
  }
);

export const updateMedicalHistory = createAsyncThunk(
  "medicalHistory/update",
  async ({ id, payload }: { id: string; payload: any }, { rejectWithValue }) => {
    try {
      const data = await updateMedicalHistoryApi(id, payload);
      return data.data.record as MedicalHistoryItem;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message ?? "Failed to update medical history");
    }
  }
);

export const deleteMedicalHistory = createAsyncThunk(
  "medicalHistory/delete",
  async (id: string, { rejectWithValue }) => {
    try {
      await deleteMedicalHistoryApi(id);
      return id;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message ?? "Failed to delete medical history");
    }
  }
);

const medicalHistorySlice = createSlice({
  name: "medicalHistory",
  initialState,
  reducers: {
    clearCurrentMedicalRecord: (state) => {
      state.currentRecord = null;
    },
    /** Drop any records that belong to a member we are no longer viewing. */
    clearMedicalRecords: (state) => {
      state.records = [];
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch by member
      .addCase(fetchMedicalHistoriesByMember.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMedicalHistoriesByMember.fulfilled, (state, action: PayloadAction<MedicalHistoryItem[]>) => {
        state.isLoading = false;
        state.records = action.payload;
      })
      .addCase(fetchMedicalHistoriesByMember.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch one
      .addCase(fetchMedicalHistory.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMedicalHistory.fulfilled, (state, action: PayloadAction<MedicalHistoryItem>) => {
        state.isLoading = false;
        state.currentRecord = action.payload;
      })
      .addCase(fetchMedicalHistory.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Create — replace by id if it already exists, otherwise prepend
      .addCase(createMedicalHistory.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createMedicalHistory.fulfilled, (state, action: PayloadAction<MedicalHistoryItem>) => {
        state.isLoading = false;
        const idx = state.records.findIndex((r) => r.id === action.payload.id);
        if (idx !== -1) state.records[idx] = action.payload;
        else state.records.unshift(action.payload);
      })
      .addCase(createMedicalHistory.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Update — replace by id
      .addCase(updateMedicalHistory.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateMedicalHistory.fulfilled, (state, action: PayloadAction<MedicalHistoryItem>) => {
        state.isLoading = false;
        const idx = state.records.findIndex((r) => r.id === action.payload.id);
        if (idx !== -1) state.records[idx] = action.payload;
        if (state.currentRecord?.id === action.payload.id) state.currentRecord = action.payload;
      })
      .addCase(updateMedicalHistory.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Delete
      .addCase(deleteMedicalHistory.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteMedicalHistory.fulfilled, (state, action: PayloadAction<string>) => {
        state.isLoading = false;
        state.records = state.records.filter((r) => r.id !== action.payload);
        if (state.currentRecord?.id === action.payload) state.currentRecord = null;
      })
      .addCase(deleteMedicalHistory.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearCurrentMedicalRecord, clearMedicalRecords } = medicalHistorySlice.actions;
export default medicalHistorySlice.reducer;