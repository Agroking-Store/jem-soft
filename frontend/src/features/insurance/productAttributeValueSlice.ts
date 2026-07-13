import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

interface ProductAttributeValue {
  id: string;
  value: string;
  productId: string;
  attributeId: string;
  attribute: {
    attributeCode: string;
    attributeName: string;
  };
}

interface ProductAttributeValueState {
  values: ProductAttributeValue[];
  isLoading: boolean;
  error: string | null;
}

const initialState: ProductAttributeValueState = {
  values: [],
  isLoading: false,
  error: null,
};

export const fetchProductAttributeValues = createAsyncThunk(
  "productAttributeValues/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/product-attribute-values`);
      return response.data.data.values;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to fetch product attribute values");
    }
  }
);

const productAttributeValueSlice = createSlice({
  name: "productAttributeValues",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(fetchProductAttributeValues.pending, (state) => { state.isLoading = true; state.error = null; }).addCase(fetchProductAttributeValues.fulfilled, (state, action: PayloadAction<ProductAttributeValue[]>) => { state.isLoading = false; state.values = action.payload; }).addCase(fetchProductAttributeValues.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string; });
  },
});

export default productAttributeValueSlice.reducer;