import axiosInstance from "@/lib/axios";
import axios from "axios";
import { API_ENDPOINTS } from "@/shared/constants/apiEndpoints";
import type {
  ClientApiResponse,
  ClientsApiResponse,
  ClientLoginApiResponse,
  ClientPayload,
  ClientUpdatePayload,
} from "../types";

export const getClientsApi = async (): Promise<ClientsApiResponse> => {
  const res = await axiosInstance.get<ClientsApiResponse>(
    API_ENDPOINTS.clients.base,
  );
  return res.data;
};

export const getClientApi = async (id: string): Promise<ClientApiResponse> => {
  const res = await axiosInstance.get<ClientApiResponse>(
    API_ENDPOINTS.clients.byId(id),
  );
  return res.data;
};

export const createClientApi = async (
  payload: ClientPayload,
): Promise<ClientApiResponse> => {
  const res = await axiosInstance.post<ClientApiResponse>(
    API_ENDPOINTS.clients.base,
    payload,
  );
  return res.data;
};

export const updateClientApi = async (
  id: string,
  payload: ClientUpdatePayload,
): Promise<ClientApiResponse> => {
  const res = await axiosInstance.put<ClientApiResponse>(
    API_ENDPOINTS.clients.byId(id),
    payload,
  );
  return res.data;
};

export const deleteClientApi = async (id: string): Promise<void> => {
  await axiosInstance.delete(API_ENDPOINTS.clients.byId(id));
};

export const loginClientApi = async (
  email: string,
  password: string,
): Promise<ClientLoginApiResponse> => {
  const res = await axiosInstance.post<ClientLoginApiResponse>(
    API_ENDPOINTS.clients.login,
    {
      email,
      password,
    },
  );
  return res.data;
};
