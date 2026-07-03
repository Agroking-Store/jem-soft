import { configureStore } from "@reduxjs/toolkit";
import authReducer from "@/features/auth/authSlice";
import customerReducer from "@/features/customers/customerSlice";
import customerMasterReducer from "@/features/customers/customerMasterSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    customers: customerReducer,
    customerMaster: customerMasterReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
