import axiosInstance from "@/lib/axios";
import type {
  CustomerMasterApiResponse,
  CustomersMasterApiResponse,
  CustomerMasterPayload,
} from "../types";

const BASE = "/customer-master";

export const getCustomersMasterApi = async (): Promise<CustomersMasterApiResponse> => {
  const res = await axiosInstance.get<CustomersMasterApiResponse>(BASE);
  return res.data;
};

export const getCustomerMasterApi = async (id: string): Promise<CustomerMasterApiResponse> => {
  const res = await axiosInstance.get<CustomerMasterApiResponse>(`${BASE}/${id}`);
  return res.data;
};

export const createCustomerMasterApi = async (
  payload: CustomerMasterPayload
): Promise<CustomerMasterApiResponse> => {
  const res = await axiosInstance.post<CustomerMasterApiResponse>(BASE, payload);
  return res.data;
};

export const updateCustomerMasterApi = async (
  id: string,
  payload: CustomerMasterPayload
): Promise<CustomerMasterApiResponse> => {
  const res = await axiosInstance.put<CustomerMasterApiResponse>(`${BASE}/${id}`, payload);
  return res.data;
};

export const deleteCustomerMasterApi = async (id: string): Promise<void> => {
  await axiosInstance.delete(`${BASE}/${id}`);
};
