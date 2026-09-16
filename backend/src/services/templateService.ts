import prisma from "../config/database.js";
import { CommunicationChannel, TemplateCategory } from "@prisma/client";

export interface TemplateVariables {
  customer_name?: string;
  policy_number?: string;
  plan_name?: string;
  premium_amount?: string | number;
  premium_mode?: string;
  due_date?: string;
  due_days?: string | number;
  due_days_text?: string;
  advisor_name?: string;
  advisor_phone?: string;
  agency_name?: string;
  provider_name?: string;
  pay_link?: string;
  [key: string]: any;
}

/**
 * Replace placeholders like {customer_name}, {due_date} in a template string
 */
export const renderTemplateText = (
  template: string,
  variables: TemplateVariables,
): string => {
  if (!template) return "";

  return template.replace(/\{(\w+)\}/g, (match, key) => {
    if (variables[key] !== undefined && variables[key] !== null) {
      return String(variables[key]);
    }
    return match;
  });
};

/**
 * Seed default insurance notification templates if they do not exist
 */
export const seedDefaultTemplates = async (): Promise<void> => {
  const defaultTemplates = [
    {
      code: "PREMIUM_DUE_ADVANCE",
      name: "Advance Premium Due Reminder (30/15/7/3 Days)",
      category: TemplateCategory.PREMIUM_DUE,
      channel: CommunicationChannel.ALL,
      subject: "Premium Due Reminder - Policy No. {policy_number}",
      smsBody:
        "🔔 *Premium Due Reminder*\n\nDear *{customer_name}*,\n\nRenewal premium for your *{provider_name}* policy is due soon. Please find the details below:\n\n📋 *Policy No:* {policy_number}\n🛡️ *Plan Name:* {plan_name}\n💰 *Installment Premium:* Rs. {premium_amount}\n⏱️ *Payment Mode:* {premium_mode}\n📅 *Due Date:* {due_date} ({due_days} days remaining)\n\nKindly make your payment before the due date to keep your life coverage and bonus benefits uninterrupted.\n\nNeed assistance? Contact your advisor:\n👤 *{advisor_name}*\n📞 *{advisor_phone}*\n🏢 {agency_name}",
      emailBody: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #1e3a8a; margin-bottom: 8px;">Premium Due Reminder</h2>
          <p>Dear <strong>{customer_name}</strong>,</p>
          <p>This is a gentle reminder regarding your upcoming policy renewal premium:</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background-color: #f8fafc;">
              <td style="padding: 10px; border: 1px solid #cbd5e1;"><strong>Policy Number:</strong></td>
              <td style="padding: 10px; border: 1px solid #cbd5e1;">{policy_number}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #cbd5e1;"><strong>Plan / Product:</strong></td>
              <td style="padding: 10px; border: 1px solid #cbd5e1;">{plan_name} ({provider_name})</td>
            </tr>
            <tr style="background-color: #f8fafc;">
              <td style="padding: 10px; border: 1px solid #cbd5e1;"><strong>Payment Frequency:</strong></td>
              <td style="padding: 10px; border: 1px solid #cbd5e1;">{premium_mode}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #cbd5e1;"><strong>Installment Premium:</strong></td>
              <td style="padding: 10px; border: 1px solid #cbd5e1; color: #b45309; font-weight: bold;">Rs. {premium_amount}</td>
            </tr>
            <tr style="background-color: #f8fafc;">
              <td style="padding: 10px; border: 1px solid #cbd5e1;"><strong>Due Date:</strong></td>
              <td style="padding: 10px; border: 1px solid #cbd5e1; color: #dc2626; font-weight: bold;">{due_date} ({due_days} days left)</td>
            </tr>
          </table>

          <p>Timely premium payment ensures continuous financial protection and valuable policy bonuses.</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 13px; color: #64748b;">
            For assistance or premium collection, please contact your insurance advisor:<br />
            <strong>{advisor_name}</strong> | Phone: {advisor_phone}<br />
            {agency_name}
          </p>
        </div>
      `,
      variables:
        "customer_name,policy_number,plan_name,provider_name,premium_amount,premium_mode,due_date,due_days,advisor_name,advisor_phone,agency_name",
    },
    {
      code: "PREMIUM_DUE_TODAY",
      name: "Premium Due Today Alert",
      category: TemplateCategory.PREMIUM_DUE,
      channel: CommunicationChannel.ALL,
      subject: "URGENT: Premium Due Today - Policy No. {policy_number}",
      smsBody:
        "🚨 *URGENT: Premium Due Today*\n\nDear *{customer_name}*,\n\nToday (*{due_date}*) is the due date for your *{provider_name}* policy renewal premium:\n\n📋 *Policy No:* {policy_number} ({plan_name})\n💰 *Amount Due:* Rs. {premium_amount}\n⏱️ *Payment Mode:* {premium_mode}\n📅 *Due Date:* Today ({due_date})\n\nKindly make payment today to avoid late fee penalties or policy lapse.\n\nAdvisor Contact:\n👤 *{advisor_name}*\n📞 *{advisor_phone}*",
      emailBody: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #fecaca; background-color: #fffafb; border-radius: 8px;">
          <h2 style="color: #dc2626; margin-bottom: 8px;">Premium Due Today Alert</h2>
          <p>Dear <strong>{customer_name}</strong>,</p>
          <p>Today is the due date for your insurance policy renewal installment:</p>
          <div style="background-color: #fee2e2; padding: 15px; border-radius: 6px; margin: 15px 0;">
            <p style="margin: 0; font-size: 16px;"><strong>Policy No:</strong> {policy_number} ({plan_name})</p>
            <p style="margin: 5px 0 0 0; font-size: 14px;"><strong>Mode:</strong> {premium_mode}</p>
            <p style="margin: 5px 0 0 0; font-size: 18px; color: #b91c1c;"><strong>Amount Due:</strong> Rs. {premium_amount}</p>
            <p style="margin: 5px 0 0 0; font-size: 14px;"><strong>Due Date:</strong> {due_date} (Today)</p>
          </div>
          <p>Please complete your payment today to maintain uninterrupted life coverage.</p>
          <p>Contact your advisor <strong>{advisor_name}</strong> at <strong>{advisor_phone}</strong> for payment guidance.</p>
        </div>
      `,
      variables:
        "customer_name,policy_number,plan_name,provider_name,premium_amount,premium_mode,due_date,advisor_name,advisor_phone",
    },
    {
      code: "POLICY_LAPSED_NOTICE",
      name: "Grace Period / Lapse Warning",
      category: TemplateCategory.POLICY_LAPSED,
      channel: CommunicationChannel.ALL,
      subject:
        "Important: Policy Grace Period Notice - Policy No. {policy_number}",
      smsBody:
        "⚠️ *Grace Period Notice*\n\nDear *{customer_name}*,\n\nYour policy *{policy_number}* ({plan_name}) is currently in its grace period.\n💰 *Amount Due:* Rs. {premium_amount}\n⏱️ *Payment Mode:* {premium_mode}\n📅 *Original Due Date:* {due_date}\n\nPay immediately to prevent policy lapse and protect your family cover.\n\nAdvisor Helpline: {advisor_name} ({advisor_phone}).",
      emailBody: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #f97316; border-radius: 8px;">
          <h2 style="color: #c2410c;">Grace Period Notice</h2>
          <p>Dear <strong>{customer_name}</strong>,</p>
          <p>Your policy <strong>{policy_number}</strong> ({plan_name}) is currently operating under the grace period. The premium of <strong>Rs. {premium_amount}</strong> ({premium_mode}) was due on <strong>{due_date}</strong>.</p>
          <p>To avoid policy lapse and loss of accumulated benefits/riders, please clear the premium at the earliest.</p>
          <p>Advisor Helpline: {advisor_name} ({advisor_phone})</p>
        </div>
      `,
      variables:
        "customer_name,policy_number,plan_name,premium_amount,premium_mode,due_date,advisor_name,advisor_phone",
    },
    {
      code: "BIRTHDAY_WISHES",
      name: "Customer Birthday Greeting",
      category: TemplateCategory.BIRTHDAY,
      channel: CommunicationChannel.ALL,
      subject: "Happy Birthday from {agency_name}! 🎂",
      smsBody:
        "🎂 *Happy Birthday {customer_name}!* 🎉\n\nWishing you a very Happy Birthday! May your special day be filled with abundant joy, health, peace, and prosperity.\n\nWarm regards,\n*{advisor_name}*\n📞 {advisor_phone}\n🏢 {agency_name}",
      emailBody: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; text-align: center; background: linear-gradient(135deg, #1e3a8a, #0f172a); color: #ffffff; border-radius: 12px;">
          <h1 style="color: #fbbf24; font-size: 28px; margin-bottom: 10px;">Happy Birthday, {customer_name}! 🎂</h1>
          <p style="font-size: 16px; line-height: 1.6; color: #e2e8f0;">
            On your special day, we wish you abundant health, happiness, prosperity, and success in the year ahead!
          </p>
          <div style="margin: 30px 0; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 20px;">
            <p style="font-size: 14px; color: #94a3b8; margin: 0;">Warmest Regards,</p>
            <p style="font-size: 18px; font-weight: bold; color: #ffffff; margin: 5px 0;">{advisor_name}</p>
            <p style="font-size: 14px; color: #cbd5e1; margin: 0;">{agency_name} | {advisor_phone}</p>
          </div>
        </div>
      `,
      variables: "customer_name,advisor_name,advisor_phone,agency_name",
    },
    {
      code: "ANNIVERSARY_WISHES",
      name: "Customer Wedding Anniversary Greeting",
      category: TemplateCategory.ANNIVERSARY,
      channel: CommunicationChannel.ALL,
      subject: "Happy Wedding Anniversary from {agency_name}! 💐",
      smsBody:
        "💐 *Happy Wedding Anniversary {customer_name}!* 🎊\n\nWishing you and your family a very Happy Wedding Anniversary! May your journey together continue to be blessed with everlasting love, health, and happiness.\n\nWarm regards,\n*{advisor_name}*\n📞 {advisor_phone}\n🏢 {agency_name}",
      emailBody: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; text-align: center; background: linear-gradient(135deg, #065f46, #064e3b); color: #ffffff; border-radius: 12px;">
          <h1 style="color: #6ee7b7; font-size: 28px; margin-bottom: 10px;">Happy Wedding Anniversary, {customer_name}! 💐</h1>
          <p style="font-size: 16px; line-height: 1.6; color: #e2e8f0;">
            May your bond of love and companionship grow stronger and brighter with each passing year!
          </p>
          <div style="margin: 30px 0; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 20px;">
            <p style="font-size: 14px; color: #a7f3d0; margin: 0;">Warmest Congratulations,</p>
            <p style="font-size: 18px; font-weight: bold; color: #ffffff; margin: 5px 0;">{advisor_name}</p>
            <p style="font-size: 14px; color: #e2e8f0; margin: 0;">{agency_name} | {advisor_phone}</p>
          </div>
        </div>
      `,
      variables: "customer_name,advisor_name,advisor_phone,agency_name",
    },
    {
      code: "MARKETING_GENERAL",
      name: "General Insurance Marketing Campaign",
      category: TemplateCategory.MARKETING,
      channel: CommunicationChannel.ALL,
      subject:
        "Protect Your Family's Future - Special Plans from {agency_name}",
      smsBody:
        "🛡️ *Secure Your Family's Financial Future*\n\nDear *{customer_name}*,\n\nEnsure your loved ones are protected with guaranteed returns and comprehensive life coverage. Special savings and retirement plans are now available.\n\nBook a free policy review or consultation today:\n👤 *{advisor_name}*\n📞 *{advisor_phone}*\n🏢 {agency_name}",
      emailBody: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #1e3a8a;">Secure Your Family's Future Today</h2>
          <p>Dear <strong>{customer_name}</strong>,</p>
          <p>As your dedicated insurance advisor, we are here to help you navigate your financial goals—from children's higher education and marriage funds to guaranteed retirement pensions and tax savings under Section 80C.</p>
          <div style="background-color: #f1f5f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h4 style="margin: 0 0 10px 0; color: #0f172a;">Key Benefits:</h4>
            <ul style="margin: 0; padding-left: 20px; color: #334155;">
              <li>High guaranteed returns & bonuses</li>
              <li>Life cover protection for loved ones</li>
              <li>Tax-free maturity proceeds</li>
              <li>Critical illness & accidental riders</li>
            </ul>
          </div>
          <p>Schedule a complimentary policy review or new plan consultation today!</p>
          <p style="margin-top: 25px;">
            <strong>{advisor_name}</strong><br />
            {agency_name}<br />
            Phone: {advisor_phone}
          </p>
        </div>
      `,
      variables: "customer_name,advisor_name,advisor_phone,agency_name",
    },
  ];

  for (const t of defaultTemplates) {
    await prisma.notificationTemplate.upsert({
      where: { code: t.code },
      update: {
        name: t.name,
        category: t.category,
        channel: t.channel,
        subject: t.subject,
        smsBody: t.smsBody,
        emailBody: t.emailBody,
        variables: t.variables,
      },
      create: t,
    });
  }
};
