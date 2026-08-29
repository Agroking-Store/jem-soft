import prisma from "../config/database.js";
import { CommunicationChannel, DeliveryStatus } from "@prisma/client";
import { sendSms } from "./smsService.js";
import { sendEmail } from "./emailService.js";
import { renderTemplateText } from "./templateService.js";

export interface CreateCampaignDTO {
  title: string;
  description?: string;
  channel: CommunicationChannel;
  templateId?: string;
  customSubject?: string;
  customMessage?: string;
  targetCriteria?: any; // e.g. { providerId, crmGroup, onlyWithActivePolicies }
  scheduledAt?: string;
}

export const getAudienceCount = async (criteria?: any) => {
  const where: any = {};

  if (criteria?.crmGroup) {
    where.miscInfo = { crmGroups: { contains: criteria.crmGroup, mode: "insensitive" } };
  }

  const allMembers = await prisma.customerMaster.findMany({
    where,
    include: {
      preferences: true,
      contactInfo: true,
      policies: true,
    },
  });

  let totalMembers = allMembers.length;
  let smsEligible = 0;
  let emailEligible = 0;

  for (const m of allMembers) {
    const hasSmsPref = m.preferences ? m.preferences.smsMarketing : true;
    const hasPhone = Boolean(m.contactInfo?.mobile1 || m.contactInfo?.mobile2);
    if (hasSmsPref && hasPhone) smsEligible++;

    const hasEmailPref = m.preferences ? m.preferences.emailMarketing : true;
    const hasEmail = Boolean(m.contactInfo?.emailPersonal || m.contactInfo?.emailBusiness);
    if (hasEmailPref && hasEmail) emailEligible++;
  }

  return {
    totalMembers,
    smsEligible,
    emailEligible,
  };
};

export const createCampaign = async (data: CreateCampaignDTO) => {
  return prisma.marketingCampaign.create({
    data: {
      title: data.title,
      description: data.description,
      channel: data.channel,
      templateId: data.templateId,
      customSubject: data.customSubject,
      customMessage: data.customMessage,
      targetCriteria: data.targetCriteria ? JSON.stringify(data.targetCriteria) : null,
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
      status: data.scheduledAt ? "SCHEDULED" : "DRAFT",
    },
    include: {
      template: true,
    },
  });
};

export const executeCampaign = async (campaignId: string) => {
  const campaign = await prisma.marketingCampaign.findUnique({
    where: { id: campaignId },
    include: { template: true },
  });

  if (!campaign) {
    throw new Error(`Campaign not found: ${campaignId}`);
  }

  // Update status to RUNNING
  await prisma.marketingCampaign.update({
    where: { id: campaignId },
    data: { status: "RUNNING" },
  });

  let criteria: any = {};
  if (campaign.targetCriteria) {
    try {
      criteria = JSON.parse(campaign.targetCriteria);
    } catch {}
  }

  const where: any = {};
  if (criteria?.crmGroup) {
    where.miscInfo = { crmGroups: { contains: criteria.crmGroup, mode: "insensitive" } };
  }

  const audience = await prisma.customerMaster.findMany({
    where,
    include: {
      preferences: true,
      contactInfo: true,
    },
  });

  let successfulCount = 0;
  let failedCount = 0;

  for (const customer of audience) {
    const customerName = `${customer.salutation ? customer.salutation + " " : ""}${customer.firstName} ${customer.lastName}`.trim();
    const phone = customer.contactInfo?.mobile1 || customer.contactInfo?.mobile2;
    const email = customer.contactInfo?.emailPersonal || customer.contactInfo?.emailBusiness;

    const allowsSms = customer.preferences ? customer.preferences.smsMarketing : true;
    const allowsEmail = customer.preferences ? customer.preferences.emailMarketing : true;

    const templateVars = {
      customer_name: customerName,
      advisor_name: "Your Insurance Advisor",
      advisor_phone: "+91-9876543210",
      agency_name: "Jem Soft Insurance",
    };

    const smsBody =
      campaign.customMessage ||
      (campaign.template?.smsBody
        ? renderTemplateText(campaign.template.smsBody, templateVars)
        : "Exclusive insurance plans available from your advisor.");

    const emailSubject =
      campaign.customSubject ||
      (campaign.template?.subject
        ? renderTemplateText(campaign.template.subject, templateVars)
        : campaign.title);

    const emailHtml = campaign.template?.emailBody
      ? renderTemplateText(campaign.template.emailBody, templateVars)
      : `<div style="font-family: Arial, sans-serif; padding: 20px;"><h3>${emailSubject}</h3><p>${smsBody}</p></div>`;

    // 1. Send SMS if allowed
    if (
      (campaign.channel === CommunicationChannel.SMS || campaign.channel === CommunicationChannel.ALL) &&
      allowsSms &&
      phone
    ) {
      const smsRes = await sendSms({ recipientPhone: phone, message: smsBody });
      if (smsRes.status === DeliveryStatus.SENT) successfulCount++;
      else failedCount++;

      await prisma.communicationLog.create({
        data: {
          customerId: customer.id,
          customerName,
          channel: CommunicationChannel.SMS,
          recipient: phone,
          content: smsBody,
          status: smsRes.status,
          errorMessage: smsRes.errorMessage,
          triggerType: "MARKETING_CAMPAIGN",
          metadata: JSON.stringify({ campaignId: campaign.id, title: campaign.title }),
        },
      });
    }

    // 2. Send Email if allowed
    if (
      (campaign.channel === CommunicationChannel.EMAIL || campaign.channel === CommunicationChannel.ALL) &&
      allowsEmail &&
      email
    ) {
      const emailRes = await sendEmail({ to: email, subject: emailSubject, html: emailHtml, text: smsBody });
      if (emailRes.status === DeliveryStatus.SENT) successfulCount++;
      else failedCount++;

      await prisma.communicationLog.create({
        data: {
          customerId: customer.id,
          customerName,
          channel: CommunicationChannel.EMAIL,
          recipient: email,
          subject: emailSubject,
          content: emailHtml,
          status: emailRes.status,
          errorMessage: emailRes.errorMessage,
          triggerType: "MARKETING_CAMPAIGN",
          metadata: JSON.stringify({ campaignId: campaign.id, title: campaign.title }),
        },
      });
    }
  }

  // Update campaign completion
  return prisma.marketingCampaign.update({
    where: { id: campaignId },
    data: {
      status: "COMPLETED",
      sentAt: new Date(),
      totalRecipients: audience.length,
      successfulCount,
      failedCount,
    },
  });
};

export const getCampaigns = async () => {
  return prisma.marketingCampaign.findMany({
    orderBy: { createdAt: "desc" },
    include: { template: true },
  });
};
