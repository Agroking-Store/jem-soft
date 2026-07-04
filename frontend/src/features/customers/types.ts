export interface Customer {
  id: string;
  name: string;
  companyName?: string | null;
  email: string;
  phone: string;

  // Customer Group fields
  groupCode?: string | null;
  groupName?: string | null;
  category?: string | null;

  // Contact Info
  mobilePersonal?: string | null;
  emailPersonal?: string | null;
  mobileBusiness?: string | null;
  emailBusiness?: string | null;

  // Preferred Communication Address
  prefCommAddress?: string | null;

  // Residence Address
  resAddressLine1?: string | null;
  resAddressLine2?: string | null;
  resAddressLine3?: string | null;
  resAddressLine4?: string | null;
  resCity?: string | null;
  resPin?: string | null;
  resState?: string | null;
  resCountry?: string | null;
  resArea?: string | null;

  // Office Address
  offAddressLine1?: string | null;
  offAddressLine2?: string | null;
  offAddressLine3?: string | null;
  offAddressLine4?: string | null;
  offCity?: string | null;
  offPin?: string | null;
  offState?: string | null;
  offCountry?: string | null;
  offArea?: string | null;

  _count?: { policies: number };
  createdAt: string;
  updatedAt: string;
}

export interface CustomerPayload {
  name: string;
  companyName?: string;
  email: string;
  phone: string;
  password: string;

  groupCode?: string;
  groupName?: string;
  category?: string;
  mobilePersonal?: string;
  emailPersonal?: string;
  mobileBusiness?: string;
  emailBusiness?: string;
  prefCommAddress?: string;
  resAddressLine1?: string;
  resAddressLine2?: string;
  resAddressLine3?: string;
  resAddressLine4?: string;
  resCity?: string;
  resPin?: string;
  resState?: string;
  resCountry?: string;
  resArea?: string;
  offAddressLine1?: string;
  offAddressLine2?: string;
  offAddressLine3?: string;
  offAddressLine4?: string;
  offCity?: string;
  offPin?: string;
  offState?: string;
  offCountry?: string;
  offArea?: string;
}

export interface CustomerUpdatePayload {
  name?: string;
  companyName?: string;
  email?: string;
  phone?: string;
  password?: string;
  groupCode?: string;
  groupName?: string;
  category?: string;
  mobilePersonal?: string;
  emailPersonal?: string;
  mobileBusiness?: string;
  emailBusiness?: string;
  prefCommAddress?: string;
  resAddressLine1?: string;
  resAddressLine2?: string;
  resAddressLine3?: string;
  resAddressLine4?: string;
  resCity?: string;
  resPin?: string;
  resState?: string;
  resCountry?: string;
  resArea?: string;
  offAddressLine1?: string;
  offAddressLine2?: string;
  offAddressLine3?: string;
  offAddressLine4?: string;
  offCity?: string;
  offPin?: string;
  offState?: string;
  offCountry?: string;
  offArea?: string;
}

export interface CustomerState {
  customers: Customer[];
  currentCustomer: Customer | null;
  portalCustomer: Customer | null;
  portalToken: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface CustomerApiResponse {
  status: string;
  data: { customer: Customer };
}

export interface CustomersApiResponse {
  status: string;
  data: { customers: Customer[] };
}

export interface CustomerLoginApiResponse {
  status: string;
  token: string;
  data: { customer: Customer };
}

// ─── Customer Master Types ────────────────────────────────────────

export interface CustomerContactInfo {
  id?: string;
  mobile1?: string | null;
  mobile2?: string | null;
  landline1Std?: string | null;
  landline1Number?: string | null;
  landline2Std?: string | null;
  landline2Number?: string | null;
  faxStd?: string | null;
  faxNumber?: string | null;
  emailPersonal?: string | null;
  emailBusiness?: string | null;
  skypeId?: string | null;
}

export interface CustomerAddress {
  id?: string;
  addressType: string;
  addressLine1?: string | null;
  addressLine2?: string | null;
  addressLine3?: string | null;
  addressLine4?: string | null;
  city?: string | null;
  pin?: string | null;
  country?: string | null;
  state?: string | null;
  area?: string | null;
  useGroupAddress?: boolean;
}

export interface CustomerBankDetail {
  id?: string;
  isDefault?: boolean;
  ifscCode?: string | null;
  bankName?: string | null;
  bankBranch?: string | null;
  city?: string | null;
  accountType?: string | null;
  accountNumber?: string | null;
  micrNumber?: string | null;
}

export interface CustomerMiscInfo {
  id?: string;
  relationToGroup?: string | null;
  dobForGreetings?: string | null;
  marriageDate?: string | null;
  isMarried?: boolean;
  demiseDate?: string | null;
  isDead?: boolean;
  fatherName?: string | null;
  motherName?: string | null;
  spouseName?: string | null;
  nationality?: string | null;
  qualification?: string | null;
  occupationType?: string | null;
  occupation?: string | null;
  employer?: string | null;
  natureOfDuties?: string | null;
  referredBy?: string | null;
  heightFt?: string | null;
  weightKg?: string | null;
  incomeSlab?: string | null;
  religion?: string | null;
  crmGroups?: string | null;
  passportNumber?: string | null;
  passportExpiryDate?: string | null;
  gstNumber?: string | null;
  specialNote?: string | null;
}

export interface CustomerServicePreferences {
  id?: string;
  preferredCommAddress?: string | null;
  smsMarketing?: boolean;
  emailMarketing?: boolean;
}

export interface CustomerMaster {
  id: string;
  groupId?: string | null;
  salutation?: string | null;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  gender?: string | null;
  dob?: string | null;
  isGroupHead?: boolean;
  customerType?: string | null;
  panNumber?: string | null;
  aadhaarNumber?: string | null;
  guardianId?: string | null;
  salutationLetter?: string | null;
  group?: { id: string; groupCode?: string | null; groupName?: string | null } | null;
  guardian?: { id: string; firstName: string; lastName: string } | null;
  contactInfo?: CustomerContactInfo | null;
  addresses?: CustomerAddress[];
  bankDetails?: CustomerBankDetail[];
  miscInfo?: CustomerMiscInfo | null;
  preferences?: CustomerServicePreferences | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerMasterPayload {
  groupId?: string;
  salutation?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  gender?: string;
  dob?: string;
  isGroupHead?: boolean;
  customerType?: string;
  panNumber?: string;
  aadhaarNumber?: string;
  guardianId?: string;
  salutationLetter?: string;
  contactInfo?: Omit<CustomerContactInfo, "id">;
  addresses?: Omit<CustomerAddress, "id">[];
  bankDetails?: Omit<CustomerBankDetail, "id">[];
  miscInfo?: Omit<CustomerMiscInfo, "id">;
  preferences?: Omit<CustomerServicePreferences, "id">;
}

export interface CustomerMasterState {
  customers: CustomerMaster[];
  currentCustomer: CustomerMaster | null;
  isLoading: boolean;
  error: string | null;
}

export interface CustomerMasterApiResponse {
  status: string;
  data: { customer: CustomerMaster };
}

export interface CustomersMasterApiResponse {
  status: string;
  data: { customers: CustomerMaster[] };
}
