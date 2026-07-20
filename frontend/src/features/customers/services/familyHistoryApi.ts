import axiosInstance from "@/lib/axios";

const BASE = "/family-history";

export const getFamilyHistoriesApi = async () => {
  const res = await axiosInstance.get(BASE);
  return res.data;
};

export const getFamilyHistoryApi = async (id: string) => {
  const res = await axiosInstance.get(`${BASE}/${id}`);
  return res.data;
};

export const getFamilyHistoriesByMemberApi = async (memberId: string) => {
  const res = await axiosInstance.get(`${BASE}/member/${memberId}`);
  return res.data;
};

export const createFamilyHistoryApi = async (payload: any) => {
  const res = await axiosInstance.post(BASE, payload);
  return res.data;
};

export const updateFamilyHistoryApi = async (id: string, payload: any) => {
  const res = await axiosInstance.put(`${BASE}/${id}`, payload);
  return res.data;
};

export const deleteFamilyHistoryApi = async (id: string) => {
  await axiosInstance.delete(`${BASE}/${id}`);
};

export const getCustomerByGroupCodeApi = async (groupCode: string) => {
  const res = await axiosInstance.get(`/customers/code/${groupCode}`);
  return res.data;
};
