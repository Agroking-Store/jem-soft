export interface Customer {
  id: string;
  name: string;
  companyName?: string | null;
  email: string;
  phone: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerPayload {
  name: string;
  companyName?: string;
  email: string;
  phone: string;
  password: string;
}

export interface CustomerUpdatePayload {
  name?: string;
  companyName?: string;
  email?: string;
  phone?: string;
  password?: string;
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
