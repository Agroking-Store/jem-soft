import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import {
  getNextRefNoApi,
  calculateQuotationApi,
  getQuotationsApi,
  getQuotationByIdApi,
  createQuotationApi,
  updateQuotationApi,
  deleteQuotationApi,
} from "./services/quotationApi";
import { QuotationState, Quotation, QuotationCalculationResult } from "./types";

const initialState: QuotationState = {
  quotations: [],
  currentQuotation: null,
  calculationResult: null,
  nextRefNo: "",
  total: 0,
  page: 1,
  limit: 6,
  totalPages: 1,
  isLoading: false,
  isCalculating: false,
  error: null,
};

export const fetchNextRefNo = createAsyncThunk(
  "quotations/fetchNextRefNo",
  async (_, { rejectWithValue }) => {
    try {
      const data = await getNextRefNoApi();
      return data.data.nextRefNo;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch reference number");
    }
  }
);

export const calculateQuotation = createAsyncThunk(
  "quotations/calculate",
  async (payload: any, { rejectWithValue }) => {
    try {
      const data = await calculateQuotationApi(payload);
      return data.data as QuotationCalculationResult;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || "Failed to calculate quotation");
    }
  }
);

export const fetchQuotations = createAsyncThunk(
  "quotations/fetchAll",
  async (
    params: { productType?: string; search?: string; field?: string; page?: number; limit?: number },
    { rejectWithValue }
  ) => {
    try {
      const data = await getQuotationsApi(params);
      return data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch quotations");
    }
  }
);

export const fetchQuotationById = createAsyncThunk(
  "quotations/fetchById",
  async (id: string, { rejectWithValue }) => {
    try {
      const data = await getQuotationByIdApi(id);
      return data.data.quotation as Quotation;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch quotation");
    }
  }
);

export const saveQuotation = createAsyncThunk(
  "quotations/create",
  async (payload: any, { rejectWithValue }) => {
    try {
      const data = await createQuotationApi(payload);
      return data.data.quotation as Quotation;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || "Failed to save quotation");
    }
  }
);

export const updateQuotation = createAsyncThunk(
  "quotations/update",
  async ({ id, payload }: { id: string; payload: any }, { rejectWithValue }) => {
    try {
      const data = await updateQuotationApi(id, payload);
      return data.data.quotation as Quotation;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || "Failed to update quotation");
    }
  }
);

export const deleteQuotation = createAsyncThunk(
  "quotations/delete",
  async (id: string, { rejectWithValue }) => {
    try {
      await deleteQuotationApi(id);
      return id;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || "Failed to delete quotation");
    }
  }
);

const quotationSlice = createSlice({
  name: "quotations",
  initialState,
  reducers: {
    clearCalculationResult: (state) => {
      state.calculationResult = null;
    },
    setCurrentQuotation: (state, action: PayloadAction<Quotation | null>) => {
      state.currentQuotation = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Next Ref No
    builder.addCase(fetchNextRefNo.fulfilled, (state, action) => {
      state.nextRefNo = action.payload;
    });

    // Calculate
    builder.addCase(calculateQuotation.pending, (state) => {
      state.isCalculating = true;
      state.error = null;
    });
    builder.addCase(calculateQuotation.fulfilled, (state, action) => {
      state.isCalculating = false;
      state.calculationResult = action.payload;
    });
    builder.addCase(calculateQuotation.rejected, (state, action) => {
      state.isCalculating = false;
      state.error = action.payload as string;
    });

    // Fetch All
    builder.addCase(fetchQuotations.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchQuotations.fulfilled, (state, action) => {
      state.isLoading = false;
      state.quotations = action.payload.quotations;
      state.total = action.payload.pagination.total;
      state.page = action.payload.pagination.page;
      state.limit = action.payload.pagination.limit;
      state.totalPages = action.payload.pagination.totalPages;
    });
    builder.addCase(fetchQuotations.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Fetch By ID
    builder.addCase(fetchQuotationById.fulfilled, (state, action) => {
      state.currentQuotation = action.payload;
    });

    // Save
    builder.addCase(saveQuotation.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(saveQuotation.fulfilled, (state, action) => {
      state.isLoading = false;
      state.quotations.unshift(action.payload);
      state.currentQuotation = action.payload;
    });
    builder.addCase(saveQuotation.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Update
    builder.addCase(updateQuotation.fulfilled, (state, action) => {
      const index = state.quotations.findIndex((q) => q.id === action.payload.id);
      if (index !== -1) {
        state.quotations[index] = action.payload;
      }
      state.currentQuotation = action.payload;
    });

    // Delete
    builder.addCase(deleteQuotation.fulfilled, (state, action) => {
      state.quotations = state.quotations.filter((q) => q.id !== action.payload);
      state.total = Math.max(0, state.total - 1);
    });
  },
});

export const { clearCalculationResult, setCurrentQuotation, clearError } = quotationSlice.actions;
export default quotationSlice.reducer;
