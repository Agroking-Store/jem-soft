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

