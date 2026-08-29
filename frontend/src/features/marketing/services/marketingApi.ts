import axiosInstance from "@/lib/axios";
import {
  CommunicationLog,
  NotificationTemplate,
  ReminderSetting,
  MarketingCampaign,
  SendReminderPayload,
  DirectMessagePayload,
} from "../types";

export const sendReminderApi = async (payload: SendReminderPayload) => {
  const res = await axiosInstance.post("/communications/send-reminder", payload);
  return res.data;
};

export const sendDirectMessageApi = async (payload: DirectMessagePayload) => {
  const res = await axiosInstance.post("/communications/send-direct", payload);
  return res.data;
};

export const getCommunicationLogsApi = async (params?: {
  customerId?: string;
  policyId?: string;
  channel?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}) => {
  const res = await axiosInstance.get<{
    success: boolean;
    data: { logs: CommunicationLog[]; total: number; page: number; totalPages: number };
  }>("/communications/logs", { params });
  return res.data;
};

export const getReminderSettingsApi = async () => {
  const res = await axiosInstance.get<{ success: boolean; data: ReminderSetting }>(
    "/communications/settings"
  );
  return res.data;
};

export const updateReminderSettingsApi = async (data: Partial<ReminderSetting>) => {
  const res = await axiosInstance.put<{ success: boolean; data: ReminderSetting }>(
    "/communications/settings",
    data
  );
  return res.data;
};

export const getTemplatesApi = async () => {
  const res = await axiosInstance.get<{ success: boolean; data: NotificationTemplate[] }>(
    "/communications/templates"
  );
  return res.data;
};

export const updateTemplateApi = async (
  id: string,
  data: Partial<NotificationTemplate>
) => {
  const res = await axiosInstance.put<{ success: boolean; data: NotificationTemplate }>(
    `/communications/templates/${id}`,
    data
  );
  return res.data;
};

export const runSchedulerScanApi = async () => {
  const res = await axiosInstance.post("/communications/run-scan");
  return res.data;
};

export const getCampaignsApi = async () => {
  const res = await axiosInstance.get<{ success: boolean; data: MarketingCampaign[] }>(
    "/marketing/campaigns"
  );
  return res.data;
};

export const createCampaignApi = async (data: Partial<MarketingCampaign>) => {
  const res = await axiosInstance.post<{ success: boolean; data: MarketingCampaign }>(
    "/marketing/campaigns",
    data
  );
  return res.data;
};

export const sendCampaignApi = async (id: string) => {
  const res = await axiosInstance.post(`/marketing/campaigns/${id}/send`);
  return res.data;
};

export const getAudienceEstimationApi = async (params?: any) => {
  const res = await axiosInstance.get<{
    success: boolean;
    data: { totalMembers: number; smsEligible: number; emailEligible: number };
  }>("/marketing/audience", { params });
  return res.data;
};
