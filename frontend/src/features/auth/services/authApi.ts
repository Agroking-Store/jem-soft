import axiosInstance from "@/lib/axios";
import { API_ENDPOINTS } from "@/shared/constants/apiEndpoints";
import type { AuthApiResponse, LoginPayload, RegisterPayload } from "../types";

export const registerApi = async (
  payload: RegisterPayload,
): Promise<AuthApiResponse> => {
  const response = await axiosInstance.post<AuthApiResponse>(
    API_ENDPOINTS.auth.register,
    payload,
  );
  return response.data;
};

export const loginApi = async (
  payload: LoginPayload,
): Promise<AuthApiResponse> => {
  const response = await axiosInstance.post<AuthApiResponse>(
    API_ENDPOINTS.auth.login,
    payload,
  );
  return response.data;
};
