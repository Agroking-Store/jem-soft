import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

interface ProductAttributeMaster {
  id: string;
  attributeName: string;
  attributeCode: string;
  attributeType: string;
}

interface ProductAttributeMasterState {
  attributes: ProductAttributeMaster[];
  isLoading: boolean;
  error: string | null;
}

const initialState: ProductAttributeMasterState = {
  attributes: [],
  isLoading: false,
  error: null,
};

// This thunk fetches the master list of all product attributes
export const fetchProductAttributes = createAsyncThunk(
  "productAttributes/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      // NOTE: This endpoint /product-attributes needs to be created in your backend.
      // It should return all records from the ProductAttributeMaster table.
      const response = await axios.get(`${API_URL}/product-attributes`);
      return response.data.data.attributes;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to fetch product attributes");
    }
  }
);

const productAttributeMasterSlice = createSlice({
  name: "productAttributes",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchProductAttributes.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchProductAttributes.fulfilled, (state, action: PayloadAction<ProductAttributeMaster[]>) => {
        state.isLoading = false;
        state.attributes = action.payload;
      })
      .addCase(fetchProductAttributes.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export default productAttributeMasterSlice.reducer;