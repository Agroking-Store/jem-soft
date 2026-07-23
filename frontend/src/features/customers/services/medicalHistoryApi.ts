import axiosInstance from "@/lib/axios";

const BASE = "/medical-history";

export const getMedicalHistoriesByMemberApi = async (memberId: string) => {
  const res = await axiosInstance.get(`${BASE}/member/${memberId}`);
  return res.data;
};

export const getMedicalHistoryApi = async (id: string) => {
  const res = await axiosInstance.get(`${BASE}/${id}`);
  return res.data;
};

export const createMedicalHistoryApi = async (payload: any) => {
  const res = await axiosInstance.post(BASE, payload);
  return res.data;
};

export const updateMedicalHistoryApi = async (id: string, payload: any) => {
  const res = await axiosInstance.put(`${BASE}/${id}`, payload);
  return res.data;
};

export const deleteMedicalHistoryApi = async (id: string) => {
  await axiosInstance.delete(`${BASE}/${id}`);
};