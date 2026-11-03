import prisma from "../config/database.js";
import { CommunicationChannel, DeliveryStatus, Prisma } from "@prisma/client";
import { differenceInCalendarDays } from "date-fns";
import { sendWhatsapp } from "./whatsappService.js";
import { sendEmail } from "./emailService.js";

const campaignRecipientInclude = {
  preferences: true,
  contactInfo: true,
  policies: {
    include: {
      product: true,
      provider: true,
      premium: true,
      premiumMode: true,
      advisor: { include: { agency: true } },
      status: true,
    },
  },
} satisfies Prisma.CustomerMasterInclude;

type CampaignRecipient = Prisma.CustomerMasterGetPayload<{
  include: typeof campaignRecipientInclude;
}>;

const inactivePolicyStatuses = new Set([
  "SURRENDERED",
  "FULLY PAID UP",
  "COMPLETED",
  "MATURITY CLAIMED",
  "CLAIMED",
  "LAPSED",
]);

export const buildCampaignTemplateVariables = (
  customer: CampaignRecipient,
  criteria: { policyId?: string; providerId?: string; productId?: string } = {},
) => {
  const matchingPolicies = customer.policies.filter(
    (policy) =>
      (!criteria.policyId || policy.id === criteria.policyId) &&
      (!criteria.providerId || policy.providerId === criteria.providerId) &&
      (!criteria.productId || policy.productId === criteria.productId),
  );
  const candidatePolicies =
    criteria.policyId || criteria.providerId || criteria.productId
      ? matchingPolicies
      : customer.policies;
  const eligiblePolicies = candidatePolicies.filter(
    (policy) => !inactivePolicyStatuses.has(policy.status.statusCode.toUpperCase()),
  );
  const policiesToRank = eligiblePolicies.length > 0 ? eligiblePolicies : candidatePolicies;
  const today = new Date();
  const selectedPolicy = [...policiesToRank].sort((a, b) => {
    const aDue = a.nextPremiumDueDate
      ? differenceInCalendarDays(a.nextPremiumDueDate, today)
      : Number.POSITIVE_INFINITY;
    const bDue = b.nextPremiumDueDate
      ? differenceInCalendarDays(b.nextPremiumDueDate, today)
      : Number.POSITIVE_INFINITY;
    const aPriority = aDue >= 0 ? 0 : 1;
    const bPriority = bDue >= 0 ? 0 : 1;

    return (
      aPriority - bPriority ||
      Math.abs(aDue) - Math.abs(bDue) ||
      b.updatedAt.getTime() - a.updatedAt.getTime()
    );
  })[0];
  const dueDays =
    selectedPolicy?.nextPremiumDueDate
      ? differenceInCalendarDays(selectedPolicy.nextPremiumDueDate, today)
      : undefined;
  const premiumAmount =
    selectedPolicy?.premium?.totalInstallmentPremium ??
    selectedPolicy?.premium?.installmentPremium;
  const advisor = selectedPolicy?.advisor;

  return {
    customer_name:
      `${customer.salutation ? `${customer.salutation} ` : ""}${customer.firstName} ${customer.lastName || ""}`.trim() ||
      "Customer",
    policy_number: selectedPolicy?.policyNumber || "Not available",
    plan_name: selectedPolicy?.product.productName || "Not available",
    provider_name: selectedPolicy?.provider.name || "Not available",
    premium_amount: premiumAmount?.toString() || "Not available",
    premium_mode: selectedPolicy?.premiumMode.modeName || "Not available",
    due_date: selectedPolicy?.nextPremiumDueDate
      ? selectedPolicy.nextPremiumDueDate.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "Not available",
    due_days: dueDays ?? "Not available",
    due_days_text:
      dueDays === undefined
        ? "Not available"
        : dueDays === 0
          ? "Today"
          : dueDays > 0
            ? `${dueDays} days remaining`
            : `${Math.abs(dueDays)} days overdue`,
    advisor_name: advisor?.advisorName || "Not available",
    advisor_phone: advisor?.phone || "Not available",
    agency_name: advisor?.agency?.agencyName || "Not available",
  };
};

export const renderCampaignTemplate = (
  template: string,
  variables: ReturnType<typeof buildCampaignTemplateVariables>,
) =>
  template.replace(/\{\{\s*(\w+)\s*\}\}|\{\s*(\w+)\s*\}/g, (_match, doubleKey, singleKey) => {
    const key = (doubleKey || singleKey).toLowerCase();
    const variable = Object.entries(variables).find(
      ([name]) => name.toLowerCase() === key,
    );

    return variable ? String(variable[1]) : "Not available";
  });

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
  let whatsappEligible = 0;
  let emailEligible = 0;

  for (const m of allMembers) {
    const hasWhatsappPref = m.preferences ? m.preferences.smsMarketing : true;
    const hasPhone = Boolean(m.contactInfo?.mobile1 || m.contactInfo?.mobile2);
    if (hasWhatsappPref && hasPhone) whatsappEligible++;

    const hasEmailPref = m.preferences ? m.preferences.emailMarketing : true;
    const hasEmail = Boolean(m.contactInfo?.emailPersonal || m.contactInfo?.emailBusiness);
    if (hasEmailPref && hasEmail) emailEligible++;
  }

  return {
    totalMembers,
    whatsappEligible,
    smsEligible: whatsappEligible,
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
    include: campaignRecipientInclude,
  });

  let successfulCount = 0;
  let failedCount = 0;
  const BATCH_SIZE = 25;
  const DELAY_BETWEEN_BATCHES_MS = 1500;

  const chunks: Array<typeof audience> = [];
  for (let i = 0; i < audience.length; i += BATCH_SIZE) {
    chunks.push(audience.slice(i, i + BATCH_SIZE));
  }

  for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
    const currentChunk = chunks[chunkIdx];
    await Promise.allSettled(
      currentChunk.map(async (customer) => {
        try {
          const customerName = `${customer.salutation ? customer.salutation + " " : ""}${customer.firstName} ${customer.lastName}`.trim();
          const phone = customer.contactInfo?.mobile1 || customer.contactInfo?.mobile2;
          const email = customer.contactInfo?.emailPersonal || customer.contactInfo?.emailBusiness;

          const allowsWhatsapp = customer.preferences ? customer.preferences.smsMarketing : true;
          const allowsEmail = customer.preferences ? customer.preferences.emailMarketing : true;

          const templateVars = buildCampaignTemplateVariables(customer, criteria);

          const messageText = renderCampaignTemplate(
            campaign.customMessage ||
            (campaign.template?.smsBody
              ? campaign.template.smsBody
              : "Exclusive insurance plans available from your advisor."),
            templateVars,
          );

          const emailSubject = renderCampaignTemplate(
            campaign.customSubject ||
            (campaign.template?.subject
              ? campaign.template.subject
              : campaign.title),
            templateVars,
          );

          const emailHtml = renderCampaignTemplate(
            campaign.template?.emailBody ||
              `<div style="font-family: Arial, sans-serif; padding: 20px;"><h3>${emailSubject}</h3><p>${messageText}</p></div>`,
            templateVars,
          );

          // 1. Send WhatsApp if allowed
          const sendWhatsappChannel =
            campaign.channel === CommunicationChannel.WHATSAPP ||
            campaign.channel === CommunicationChannel.ALL ||
            (campaign.channel as any) === "SMS";

          if (sendWhatsappChannel && allowsWhatsapp && phone) {
            const waRes = await sendWhatsapp({ recipientPhone: phone, message: messageText });
            if (waRes.status === DeliveryStatus.SENT) successfulCount++;
            else failedCount++;

            await prisma.communicationLog.create({
              data: {
                customerId: customer.id,
                customerName,
                channel: CommunicationChannel.WHATSAPP,
                recipient: phone,
                content: messageText,
                status: waRes.status,
                errorMessage: waRes.errorMessage,
                triggerType: "MARKETING_CAMPAIGN",
                metadata: JSON.stringify({ campaignId: campaign.id, title: campaign.title, batch: chunkIdx + 1 }),
              },
            });
          }

          // 2. Send Email if allowed
          if (
            (campaign.channel === CommunicationChannel.EMAIL || campaign.channel === CommunicationChannel.ALL) &&
            allowsEmail &&
            email
          ) {
            const emailRes = await sendEmail({ to: email, subject: emailSubject, html: emailHtml, text: messageText });
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
                metadata: JSON.stringify({ campaignId: campaign.id, title: campaign.title, batch: chunkIdx + 1 }),
              },
            });
          }
        } catch (itemErr: any) {
          failedCount++;
          console.error(`Error in broadcast to customer ${customer.id}:`, itemErr.message);
        }
      })
    );

    // Update partial counts
    await prisma.marketingCampaign.update({
      where: { id: campaignId },
      data: {
        totalRecipients: audience.length,
        successfulCount,
        failedCount,
      },
    });

    // Delay between batches if more remain
    if (chunkIdx < chunks.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_BATCHES_MS));
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
