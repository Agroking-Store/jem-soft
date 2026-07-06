import { configureStore } from "@reduxjs/toolkit";
import authReducer from "@/features/auth/authSlice";
import customerReducer from "@/features/customers/customerSlice";
import customerMasterReducer from "@/features/customers/customerMasterSlice";
import familyHistoryReducer from "@/features/customers/familyHistorySlice";
import insuranceProviderReducer from "@/features/insurance/insuranceProviderSlice";
import productMasterReducer from "@/features/insurance/productMasterSlice";
import riderMasterReducer from "@/features/riders/riderMasterSlice";
import advisorReducer from "@/features/advisor/advisorSlice";
import policyReducer from "@/features/policy/policySlice";
import policyStatusMasterReducer from "@/features/policy/policyStatusMasterSlice";
import premiumModeMasterReducer from "@/features/policy/premiumModeMasterSlice";
import licBranchReducer from "@/features/lic/licBranchSlice";
import agencyReducer from "@/features/agency/agencySlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    customers: customerReducer,
    customerMaster: customerMasterReducer,
    familyHistory: familyHistoryReducer,
    insuranceProviders: insuranceProviderReducer,
    products: productMasterReducer,
    riderMaster: riderMasterReducer,
    advisors: advisorReducer,
    policies: policyReducer,
    policyStatuses: policyStatusMasterReducer,
    premiumModes: premiumModeMasterReducer,
    licBranch: licBranchReducer, // Added licBranch reducer
    agency: agencyReducer, // Added agency reducer
  },
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;