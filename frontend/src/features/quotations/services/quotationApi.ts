import axiosInstance from "@/lib/axios";
import { Quotation, QuotationCalculationResult } from "../types";

export const getNextRefNoApi = async () => {
  const response = await axiosInstance.get("/quotations/next-ref");
  return response.data;
};

export const calculateQuotationApi = async (data: any) => {
  const response = await axiosInstance.post("/quotations/calculate", data);
  return response.data;
};

export const getQuotationsApi = async (params: {
  productType?: string;
  search?: string;
  field?: string;
  page?: number;
  limit?: number;
}) => {
  const response = await axiosInstance.get("/quotations", { params });
  return response.data;
};

export const getQuotationByIdApi = async (id: string) => {
  const response = await axiosInstance.get(`/quotations/${id}`);
  return response.data;
};

export const createQuotationApi = async (data: any) => {
  const response = await axiosInstance.post("/quotations", data);
  return response.data;
};

export const updateQuotationApi = async (id: string, data: any) => {
  const response = await axiosInstance.put(`/quotations/${id}`, data);
  return response.data;
};

export const deleteQuotationApi = async (id: string) => {
  const response = await axiosInstance.delete(`/quotations/${id}`);
  return response.data;
};
