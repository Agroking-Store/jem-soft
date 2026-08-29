export type CommunicationChannel = "SMS" | "EMAIL" | "IN_APP" | "ALL";
export type DeliveryStatus = "PENDING" | "SENT" | "FAILED" | "SKIPPED";
export type TemplateCategory = "PREMIUM_DUE" | "POLICY_LAPSED" | "BIRTHDAY" | "ANNIVERSARY" | "MARKETING" | "CUSTOM";

export interface NotificationTemplate {
  id: string;
  code: string;
  name: string;
  category: TemplateCategory;
  channel: CommunicationChannel;
  subject?: string;
  smsBody?: string;
  emailBody?: string;
  isActive: boolean;
  variables?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommunicationLog {
  id: string;
  customerId?: string;
  customerName?: string;
  policyId?: string;
  policyNumber?: string;
  channel: CommunicationChannel;
  recipient: string;
  subject?: string;
  content: string;
  status: DeliveryStatus;
  errorMessage?: string;
  triggerType: string;
  metadata?: string;
  createdAt: string;
}

export interface ReminderSetting {
  id: string;
  isAutoReminderEnabled: boolean;
  dueDaysBefore: string;
  sendSms: boolean;
  sendEmail: boolean;
  sendInApp: boolean;
  isBirthdayWishesEnabled: boolean;
  cronScheduleTime: string;
  lastRunAt?: string;
  updatedAt: string;
}

export interface MarketingCampaign {
  id: string;
  title: string;
  description?: string;
  channel: CommunicationChannel;
  templateId?: string;
  template?: NotificationTemplate;
  customSubject?: string;
  customMessage?: string;
  targetCriteria?: string;
  status: string;
  scheduledAt?: string;
  sentAt?: string;
  totalRecipients: number;
  successfulCount: number;
  failedCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SendReminderPayload {
  policyId: string;
  templateCode?: string;
  customMessage?: string;
  customSubject?: string;
  channel?: "SMS" | "EMAIL" | "ALL";
}

export interface DirectMessagePayload {
  customerId: string;
  channel: CommunicationChannel;
  subject?: string;
  message: string;
  policyId?: string;
}
