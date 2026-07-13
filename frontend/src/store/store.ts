import { configureStore } from "@reduxjs/toolkit";
import authReducer from "@/features/auth/authSlice";
import customerReducer from "@/features/customers/customerSlice";
import customerMasterReducer from "@/features/customers/customerMasterSlice";
import insuranceProviderReducer from "@/features/insurance/insuranceProviderSlice";
import productMasterReducer from "@/features/insurance/productMasterSlice";
import riderMasterReducer from "@/features/riders/riderMasterSlice";
import advisorReducer from "@/features/advisor/advisorSlice";
import policyReducer from "@/features/policy/policySlice";
import policyStatusMasterReducer from "@/features/policy/policyStatusMasterSlice";
import premiumModeMasterReducer from "@/features/policy/premiumModeMasterSlice";
import licBranchReducer from "@/features/lic/licBranchSlice";
import agencyReducer from "@/features/agency/agencySlice";
import familyHistoryReducer from "@/features/customers/familyHistorySlice";
import productAttributeValueReducer from "@/features/insurance/productAttributeValueSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    customers: customerReducer,
    customerMaster: customerMasterReducer,
    insuranceProviders: insuranceProviderReducer,
    products: productMasterReducer,
    riderMaster: riderMasterReducer,
    advisors: advisorReducer,
    policies: policyReducer,
    policyStatuses: policyStatusMasterReducer,
    premiumModes: premiumModeMasterReducer,
    licBranch: licBranchReducer,
    agency: agencyReducer,
    familyHistory: familyHistoryReducer,
    productAttributeValues: productAttributeValueReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;