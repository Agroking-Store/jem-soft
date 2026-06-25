import axiosInstance from "@/lib/axios";
import axios from "axios";
import { API_ENDPOINTS } from "@/shared/constants/apiEndpoints";
import type {
  CustomerApiResponse,
  CustomersApiResponse,
  CustomerLoginApiResponse,
  CustomerPayload,
  CustomerUpdatePayload,
} from "../types";

export const getCustomersApi = async (): Promise<CustomersApiResponse> => {
  const res = await axiosInstance.get<CustomersApiResponse>(API_ENDPOINTS.customers.base);
  return res.data;
};

export const getCustomerApi = async (id: string): Promise<CustomerApiResponse> => {
  const res = await axiosInstance.get<CustomerApiResponse>(API_ENDPOINTS.customers.byId(id));
  return res.data;
};

export const createCustomerApi = async (payload: CustomerPayload): Promise<CustomerApiResponse> => {
  const res = await axiosInstance.post<CustomerApiResponse>(API_ENDPOINTS.customers.base, payload);
  return res.data;
};

export const updateCustomerApi = async (
  id: string,
  payload: CustomerUpdatePayload
): Promise<CustomerApiResponse> => {
  const res = await axiosInstance.put<CustomerApiResponse>(API_ENDPOINTS.customers.byId(id), payload);
  return res.data;
};

export const deleteCustomerApi = async (id: string): Promise<void> => {
  await axiosInstance.delete(API_ENDPOINTS.customers.byId(id));
};

export const loginCustomerApi = async (
  email: string,
  password: string
): Promise<CustomerLoginApiResponse> => {
  const res = await axios.post<CustomerLoginApiResponse>(API_ENDPOINTS.customers.login, {
    email,
    password,
  });
  return res.data;
};
