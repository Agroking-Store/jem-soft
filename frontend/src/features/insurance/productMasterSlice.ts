import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import axios, { isAxiosError } from "axios";
import type { RootState } from "@/store/store";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export interface ProductMaster {
  id: string;
  providerId: string;
  categoryId: string;
  productName: string;
  productCode: string;
  planNumber?: string | null;
  productType?: string | null;
  description?: string | null;
  isActive: boolean;
  provider: { id: string; name: string; code: string };
  category: { id: string; categoryName: string; categoryCode: string };
}

interface ProductMasterState {
  products: ProductMaster[];
  isLoading: boolean;
  error: string | null;
}

const initialState: ProductMasterState = {
  products: [],
  isLoading: false,
  error: null,
};

export const fetchProducts = createAsyncThunk<ProductMaster[], void, { rejectValue: string; state: RootState }>(
  "products/fetch",
  async (_, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      const config = {
        headers: { Authorization: `Bearer ${token}` },
      };
      const response = await axios.get(`${API_URL}/products`, config);
      return response.data.data;
    } catch (error) {
      if (isAxiosError(error)) {
        return rejectWithValue(error.response?.data?.message || "Failed to fetch products");
      }
      return rejectWithValue("An unexpected error occurred while fetching products.");
    }
  }
);

const productMasterSlice = createSlice({
  name: "products",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(fetchProducts.pending, (state) => { state.isLoading = true; state.error = null; }).addCase(fetchProducts.fulfilled, (state, action: PayloadAction<ProductMaster[]>) => { state.isLoading = false; state.products = action.payload; }).addCase(fetchProducts.rejected, (state, action) => { state.isLoading = false; state.error = action.payload || "An unknown error occurred"; });
  },
});

export default productMasterSlice.reducer;