import prisma from "../config/database.js";
import {
  CommunicationChannel,
  DeliveryStatus,
  NotificationType,
  Prisma,
} from "@prisma/client";
import { renderTemplateText, TemplateVariables, seedDefaultTemplates } from "./templateService.js";
import { sendSms } from "./smsService.js";
import { sendEmail } from "./emailService.js";

export interface SendReminderOptions {
  policyId: string;
  templateCode?: string;
  triggerType?: "AUTOMATED_CRON" | "MANUAL_REMINDER" | "MARKETING_CAMPAIGN";
  customMessage?: string;
  customSubject?: string;
  dueDaysRemaining?: number;
  channel?: "SMS" | "EMAIL" | "ALL";
}

export interface DirectMessageOptions {
  customerId: string;
  channel: CommunicationChannel;
  subject?: string;
  message: string;
  triggerType?: string;
  policyId?: string;
}

/**
 * Send Policy Due Reminder honoring Customer Service Preferences
 */
export const sendPolicyDueReminder = async (options: SendReminderOptions) => {
  const { policyId, triggerType = "MANUAL_REMINDER", customMessage, customSubject, channel = "ALL" } = options;

  // 1. Fetch Policy with Customer, Member, Calculations, Advisor, Agency
  const policy = await prisma.policy.findUnique({
    where: { id: policyId },
    include: {
      customer: true,
      CustomerMaster: {
        include: {
          contactInfo: true,
          preferences: true,
          addresses: true,
        },
      },
      product: true,
      provider: true,
      premium: true,
      advisor: {
        include: {
          agency: true,
        },
      },
      branch: true,
    },
  });

  if (!policy) {
    throw new Error(`Policy not found with ID: ${policyId}`);
  }

  const customerMaster = policy.CustomerMaster;
  const preferences = customerMaster?.preferences;
  const contactInfo = customerMaster?.contactInfo;

  // Customer Contact Info
  const recipientPhone =
    contactInfo?.mobile1 ||
    contactInfo?.mobile2 ||
    policy.customer?.mobilePersonal ||
    policy.customer?.phone;

  const recipientEmail =
    contactInfo?.emailPersonal ||
    contactInfo?.emailBusiness ||
    policy.customer?.emailPersonal ||
    policy.customer?.email;

  const customerName = `${customerMaster?.salutation ? customerMaster.salutation + " " : ""}${customerMaster?.firstName || ""} ${customerMaster?.lastName || ""}`.trim() || policy.customer?.name || "Valued Customer";

  // Calculate Due Days
  let dueDays = options.dueDaysRemaining;
  let formattedDueDate = "N/A";
  if (policy.nextPremiumDueDate) {
    const dueTime = new Date(policy.nextPremiumDueDate).getTime();
    const nowTime = new Date().setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((dueTime - nowTime) / (1000 * 60 * 60 * 24));
    if (dueDays === undefined) {
      dueDays = diffDays;
    }
    formattedDueDate = new Date(policy.nextPremiumDueDate).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  const premiumAmount =
    policy.premium?.totalInstallmentPremium?.toString() ||
    policy.premium?.installmentPremium?.toString() ||
    "0.00";

  // Determine Template Code
  let templateCode = options.templateCode;
  if (!templateCode) {
    if (dueDays !== undefined && dueDays <= 0) {
      templateCode = "PREMIUM_DUE_TODAY";
    } else if (dueDays !== undefined && dueDays < 0) {
      templateCode = "POLICY_LAPSED_NOTICE";
    } else {
      templateCode = "PREMIUM_DUE_ADVANCE";
    }
  }

  // Ensure default templates exist
  let template = await prisma.notificationTemplate.findUnique({
    where: { code: templateCode },
  });

  if (!template) {
    await seedDefaultTemplates();
    template = await prisma.notificationTemplate.findUnique({
      where: { code: templateCode },
    });
  }

  const templateVars: TemplateVariables = {
    customer_name: customerName,
    policy_number: policy.policyNumber,
    plan_name: policy.product?.productName || "Insurance Plan",
    provider_name: policy.provider?.name || "LIC",
    premium_amount: premiumAmount,
    due_date: formattedDueDate,
    due_days: dueDays !== undefined ? Math.max(0, dueDays) : "upcoming",
    advisor_name: policy.advisor?.advisorName || "Your Insurance Advisor",
    advisor_phone: policy.advisor?.phone || "+91-9876543210",
    agency_name: policy.advisor?.agency?.agencyName || "Jem Soft Insurance Agency",
  };

  const emailSubject =
    customSubject ||
    renderTemplateText(template?.subject || "Insurance Premium Reminder", templateVars);

  const smsText =
    customMessage ||
    renderTemplateText(
      template?.smsBody ||
        `Dear ${customerName}, your policy ${policy.policyNumber} premium of Rs. ${premiumAmount} is due on ${formattedDueDate}.`,
      templateVars
    );

  const emailHtml = renderTemplateText(
    template?.emailBody || `<p>${smsText}</p>`,
    templateVars
  );

  const results: {
    sms?: { status: DeliveryStatus; message?: string };
    email?: { status: DeliveryStatus; message?: string };
    inApp?: { status: DeliveryStatus; message?: string };
  } = {};

  // Check Preferences: Default to true if preferences record does not exist
  const allowsSms = preferences ? preferences.smsMarketing : true;
  const allowsEmail = preferences ? preferences.emailMarketing : true;

  // 1. DISPATCH SMS (if opted in AND channel allows)
  const sendSmsChannel = channel === "SMS" || channel === "ALL";
  if (sendSmsChannel && allowsSms && recipientPhone) {
    const smsResult = await sendSms({
      recipientPhone,
      message: smsText,
    });

    results.sms = {
      status: smsResult.status,
      message: smsResult.errorMessage || "SMS Sent",
    };

    await prisma.communicationLog.create({
      data: {
        customerId: customerMaster?.id || policy.customer?.id,
        customerName,
        policyId: policy.id,
        policyNumber: policy.policyNumber,
        channel: CommunicationChannel.SMS,
        recipient: recipientPhone,
        subject: null,
        content: smsText,
        status: smsResult.status,
        errorMessage: smsResult.errorMessage,
        triggerType,
        metadata: JSON.stringify({ templateCode, dueDays }),
      },
    });
  } else if (!allowsSms) {
    results.sms = { status: DeliveryStatus.SKIPPED, message: "Customer opted out of SMS" };
    await prisma.communicationLog.create({
      data: {
        customerId: customerMaster?.id || policy.customer?.id,
        customerName,
        policyId: policy.id,
        policyNumber: policy.policyNumber,
        channel: CommunicationChannel.SMS,
        recipient: recipientPhone || "N/A",
        subject: null,
        content: smsText,
        status: DeliveryStatus.SKIPPED,
        errorMessage: "Customer disabled SMS Marketing in Service Preferences",
        triggerType,
      },
    });
  }

  // 2. DISPATCH EMAIL (if opted in AND channel allows)
  const sendEmailChannel = channel === "EMAIL" || channel === "ALL";
  if (sendEmailChannel && allowsEmail && recipientEmail) {
    const emailResult = await sendEmail({
      to: recipientEmail,
      subject: emailSubject,
      html: emailHtml,
      text: smsText,
    });

    results.email = {
      status: emailResult.status,
      message: emailResult.errorMessage || "Email Sent",
    };

    await prisma.communicationLog.create({
      data: {
        customerId: customerMaster?.id || policy.customer?.id,
        customerName,
        policyId: policy.id,
        policyNumber: policy.policyNumber,
        channel: CommunicationChannel.EMAIL,
        recipient: recipientEmail,
        subject: emailSubject,
        content: emailHtml,
        status: emailResult.status,
        errorMessage: emailResult.errorMessage,
        triggerType,
        metadata: JSON.stringify({ templateCode, dueDays }),
      },
    });
  } else if (!allowsEmail) {
    results.email = { status: DeliveryStatus.SKIPPED, message: "Customer opted out of Email" };
    await prisma.communicationLog.create({
      data: {
        customerId: customerMaster?.id || policy.customer?.id,
        customerName,
        policyId: policy.id,
        policyNumber: policy.policyNumber,
        channel: CommunicationChannel.EMAIL,
        recipient: recipientEmail || "N/A",
        subject: emailSubject,
        content: emailHtml,
        status: DeliveryStatus.SKIPPED,
        errorMessage: "Customer disabled Email Marketing in Service Preferences",
        triggerType,
      },
    });
  }

  // 3. IN-APP NOTIFICATION (Always created for agent/admin visibility)
  try {
    await prisma.notification.create({
      data: {
        title: `Premium Due Alert: Policy ${policy.policyNumber}`,
        message: `Premium of Rs. ${premiumAmount} for ${customerName} is due on ${formattedDueDate} (${dueDays} days remaining).`,
        type: NotificationType.PREMIUM_DUE,
        policyId: policy.id,
      },
    });

    results.inApp = { status: DeliveryStatus.SENT, message: "In-App Notification Created" };
  } catch (err: any) {
    results.inApp = { status: DeliveryStatus.FAILED, message: err.message };
  }

  return {
    success: true,
    policyNumber: policy.policyNumber,
    customerName,
    results,
  };
};

/**
 * Send Direct Message to Customer (Single or Broadcast)
 */
export const sendDirectMessage = async (options: DirectMessageOptions) => {
  const { customerId, channel, subject, message, triggerType = "DIRECT_MESSAGE", policyId } = options;

  const customerMaster = await prisma.customerMaster.findUnique({
    where: { id: customerId },
    include: {
      contactInfo: true,
      preferences: true,
    },
  });

  if (!customerMaster) {
    throw new Error(`Customer not found with ID: ${customerId}`);
  }

  const preferences = customerMaster.preferences;
  const contactInfo = customerMaster.contactInfo;
  const customerName = `${customerMaster.salutation ? customerMaster.salutation + " " : ""}${customerMaster.firstName} ${customerMaster.lastName}`.trim();

  const recipientPhone = contactInfo?.mobile1 || contactInfo?.mobile2;
  const recipientEmail = contactInfo?.emailPersonal || contactInfo?.emailBusiness;

  const results: any = {};

  if (channel === CommunicationChannel.SMS || channel === CommunicationChannel.ALL) {
    if (preferences && !preferences.smsMarketing) {
      results.sms = { status: DeliveryStatus.SKIPPED, message: "Opted out of SMS" };
    } else if (recipientPhone) {
      const res = await sendSms({ recipientPhone, message });
      results.sms = res;
      await prisma.communicationLog.create({
        data: {
          customerId: customerMaster.id,
          customerName,
          policyId,
          channel: CommunicationChannel.SMS,
          recipient: recipientPhone,
          content: message,
          status: res.status,
          errorMessage: res.errorMessage,
          triggerType,
        },
      });
    }
  }

  if (channel === CommunicationChannel.EMAIL || channel === CommunicationChannel.ALL) {
    if (preferences && !preferences.emailMarketing) {
      results.email = { status: DeliveryStatus.SKIPPED, message: "Opted out of Email" };
    } else if (recipientEmail) {
      const res = await sendEmail({
        to: recipientEmail,
        subject: subject || "Important Notification from Jem Soft",
        html: `<div style="font-family: Arial, sans-serif; padding: 20px;">${message}</div>`,
        text: message,
      });
      results.email = res;
      await prisma.communicationLog.create({
        data: {
          customerId: customerMaster.id,
          customerName,
          policyId,
          channel: CommunicationChannel.EMAIL,
          recipient: recipientEmail,
          subject: subject || "Notification",
          content: message,
          status: res.status,
          errorMessage: res.errorMessage,
          triggerType,
        },
      });
    }
  }

  return { success: true, customerName, results };
};

/**
 * Get Communication Logs with pagination & filters
 */
export const getCommunicationLogs = async (filters: {
  customerId?: string;
  policyId?: string;
  channel?: CommunicationChannel;
  status?: DeliveryStatus;
  search?: string;
  page?: number;
  limit?: number;
}) => {
  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(100, Math.max(1, filters.limit || 20));
  const skip = (page - 1) * limit;

  const where: Prisma.CommunicationLogWhereInput = {};

  if (filters.customerId) where.customerId = filters.customerId;
  if (filters.policyId) where.policyId = filters.policyId;
  if (filters.channel) where.channel = filters.channel;
  if (filters.status) where.status = filters.status;

  if (filters.search) {
    where.OR = [
      { customerName: { contains: filters.search, mode: "insensitive" } },
      { recipient: { contains: filters.search, mode: "insensitive" } },
      { policyNumber: { contains: filters.search, mode: "insensitive" } },
      { content: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  const [total, logs] = await Promise.all([
    prisma.communicationLog.count({ where }),
    prisma.communicationLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
  ]);

  return {
    logs,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
};

/**
 * Manage Reminder Settings
 */
export const getReminderSettings = async () => {
  let settings = await prisma.reminderSetting.findFirst();
  if (!settings) {
    settings = await prisma.reminderSetting.create({
      data: {
        isAutoReminderEnabled: true,
        dueDaysBefore: "30,15,7,1,0",
        sendSms: true,
        sendEmail: true,
        sendInApp: true,
        isBirthdayWishesEnabled: true,
        cronScheduleTime: "09:00",
      },
    });
  }
  return settings;
};

export const updateReminderSettings = async (data: {
  isAutoReminderEnabled?: boolean;
  dueDaysBefore?: string;
  sendSms?: boolean;
  sendEmail?: boolean;
  sendInApp?: boolean;
  isBirthdayWishesEnabled?: boolean;
  cronScheduleTime?: string;
}) => {
  const current = await getReminderSettings();
  return prisma.reminderSetting.update({
    where: { id: current.id },
    data,
  });
};
