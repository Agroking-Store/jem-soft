import axiosInstance from "@/lib/axios";
import { API_ENDPOINTS } from "@/shared/constants/apiEndpoints";
import type {
  UsersApiResponse,
  UserApiResponse,
  CreateUserPayload,
  UpdateUserPayload,
  ResetPasswordPayload,
} from "./types";

export const getAllUsersApi = async (): Promise<UsersApiResponse> => {
  const res = await axiosInstance.get<UsersApiResponse>(
    API_ENDPOINTS.users.base,
  );
  return res.data;
};

export const getUserByIdApi = async (id: string): Promise<UserApiResponse> => {
  const res = await axiosInstance.get<UserApiResponse>(
    API_ENDPOINTS.users.byId(id),
  );
  return res.data;
};

export const createUserApi = async (
  payload: CreateUserPayload,
): Promise<UserApiResponse> => {
  const res = await axiosInstance.post<UserApiResponse>(
    API_ENDPOINTS.users.base,
    payload,
  );
  return res.data;
};

export const updateUserApi = async (
  id: string,
  payload: UpdateUserPayload,
): Promise<UserApiResponse> => {
  const res = await axiosInstance.patch<UserApiResponse>(
    API_ENDPOINTS.users.byId(id),
    payload,
  );
  return res.data;
};

export const deleteUserApi = async (id: string): Promise<void> => {
  await axiosInstance.delete(API_ENDPOINTS.users.byId(id));
};

export const resetUserPasswordApi = async (
  id: string,
  payload: ResetPasswordPayload,
): Promise<void> => {
  await axiosInstance.patch(API_ENDPOINTS.users.resetPassword(id), payload);
};
