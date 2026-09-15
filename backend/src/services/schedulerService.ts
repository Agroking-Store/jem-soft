import prisma from "../config/database.js";
import cron from "node-cron";
import { getReminderSettings, sendPolicyDueReminder } from "./communicationService.js";
import { sendSms } from "./smsService.js";
import { sendEmail } from "./emailService.js";
import { renderTemplateText, seedDefaultTemplates } from "./templateService.js";
import { CommunicationChannel } from "@prisma/client";

/**
 * Scan all policies and trigger due date reminders and birthday wishes
 */
export const runSchedulerScan = async () => {
  console.log("⏰ [SCHEDULER] Starting automated communication scan...");

  const settings = await getReminderSettings();
  if (!settings.isAutoReminderEnabled) {
    console.log("⏸️ [SCHEDULER] Automated reminders are currently disabled in settings.");
    return { status: "SKIPPED", message: "Automated reminders are disabled" };
  }

  // Parse days from comma-separated string e.g. "30,15,7,1,0"
  const targetDays = settings.dueDaysBefore
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let totalPoliciesScanned = 0;
  let remindersDispatched = 0;
  let birthdaysDispatched = 0;
  let anniversariesDispatched = 0;

  // 1. SCAN POLICIES FOR DUE DATES
  const activePolicies = await prisma.policy.findMany({
    where: {
      nextPremiumDueDate: { not: null },
    },
    include: {
      CustomerMaster: {
        include: {
          preferences: true,
          contactInfo: true,
        },
      },
      premium: true,
      product: true,
    },
  });

  totalPoliciesScanned = activePolicies.length;

  for (const policy of activePolicies) {
    if (!policy.nextPremiumDueDate) continue;

    const dueDate = new Date(policy.nextPremiumDueDate);
    dueDate.setHours(0, 0, 0, 0);

    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    // Check if diffDays matches any of the configured target days
    if (targetDays.includes(diffDays)) {
      try {
        await sendPolicyDueReminder({
          policyId: policy.id,
          triggerType: "AUTOMATED_CRON",
          dueDaysRemaining: diffDays,
        });
        remindersDispatched++;
        console.log(`✅ [SCHEDULER] Sent reminder for policy ${policy.policyNumber} (Due in ${diffDays} days)`);
      } catch (err: any) {
        console.error(`❌ [SCHEDULER] Error sending reminder for policy ${policy.policyNumber}:`, err.message);
      }
    }
  }

  // 2. SCAN FOR BIRTHDAYS & ANNIVERSARIES (if enabled)
  if (settings.isBirthdayWishesEnabled) {
    const currentMonth = today.getMonth() + 1; // 1-12
    const currentDay = today.getDate(); // 1-31

    const allCustomers = await prisma.customerMaster.findMany({
      include: {
        miscInfo: true,
        preferences: true,
        contactInfo: true,
      },
    });

    for (const cm of allCustomers) {
      const customerName = `${cm.salutation ? cm.salutation + " " : ""}${cm.firstName} ${cm.lastName}`.trim();
      const phone = cm.contactInfo?.mobile1 || cm.contactInfo?.mobile2;
      const email = cm.contactInfo?.emailPersonal || cm.contactInfo?.emailBusiness;
      const allowsSms = cm.preferences ? cm.preferences.smsMarketing : true;
      const allowsEmail = cm.preferences ? cm.preferences.emailMarketing : true;

      const templateVars = {
        customer_name: customerName,
        advisor_name: "Your Insurance Advisor",
        advisor_phone: "+91-9876543210",
        agency_name: "Jem Soft Insurance",
      };

      // --- A. Birthday Check ---
      const birthDate = cm.miscInfo?.dobForGreetings ? new Date(cm.miscInfo.dobForGreetings) : cm.dob ? new Date(cm.dob) : null;
      if (birthDate && birthDate.getMonth() + 1 === currentMonth && birthDate.getDate() === currentDay) {
        try {
          let birthdayTmpl = await prisma.notificationTemplate.findUnique({
            where: { code: "BIRTHDAY_WISHES" },
          });

          if (!birthdayTmpl) {
            await seedDefaultTemplates();
            birthdayTmpl = await prisma.notificationTemplate.findUnique({
              where: { code: "BIRTHDAY_WISHES" },
            });
          }

          const smsText = renderTemplateText(birthdayTmpl?.smsBody || `Happy Birthday ${customerName}!`, templateVars);
          const emailHtml = renderTemplateText(birthdayTmpl?.emailBody || `<p>${smsText}</p>`, templateVars);
          const emailSubject = renderTemplateText(birthdayTmpl?.subject || "Happy Birthday! 🎂", templateVars);

          if (allowsSms && phone) {
            const smsRes = await sendSms({ recipientPhone: phone, message: smsText });
            await prisma.communicationLog.create({
              data: {
                customerId: cm.id,
                customerName,
                channel: CommunicationChannel.SMS,
                recipient: phone,
                content: smsText,
                status: smsRes.status,
                errorMessage: smsRes.errorMessage,
                triggerType: "AUTOMATED_CRON",
                metadata: JSON.stringify({ event: "BIRTHDAY" }),
              },
            });
          }

          if (allowsEmail && email) {
            const emailRes = await sendEmail({ to: email, subject: emailSubject, html: emailHtml, text: smsText });
            await prisma.communicationLog.create({
              data: {
                customerId: cm.id,
                customerName,
                channel: CommunicationChannel.EMAIL,
                recipient: email,
                subject: emailSubject,
                content: emailHtml,
                status: emailRes.status,
                errorMessage: emailRes.errorMessage,
                triggerType: "AUTOMATED_CRON",
                metadata: JSON.stringify({ event: "BIRTHDAY" }),
              },
            });
          }

          birthdaysDispatched++;
          console.log(`🎂 [SCHEDULER] Dispatched birthday wishes to ${customerName}`);
        } catch (err: any) {
          console.error(`❌ [SCHEDULER] Error sending birthday wish to ${customerName}:`, err.message);
        }
      }

      // --- B. Wedding Anniversary Check ---
      const anniversaryDate = cm.miscInfo?.marriageDate ? new Date(cm.miscInfo.marriageDate) : null;
      if (anniversaryDate && anniversaryDate.getMonth() + 1 === currentMonth && anniversaryDate.getDate() === currentDay) {
        try {
          let annivTmpl = await prisma.notificationTemplate.findUnique({
            where: { code: "ANNIVERSARY_WISHES" },
          });

          if (!annivTmpl) {
            await seedDefaultTemplates();
            annivTmpl = await prisma.notificationTemplate.findUnique({
              where: { code: "ANNIVERSARY_WISHES" },
            });
          }

          const smsText = renderTemplateText(annivTmpl?.smsBody || `Happy Wedding Anniversary ${customerName}!`, templateVars);
          const emailHtml = renderTemplateText(annivTmpl?.emailBody || `<p>${smsText}</p>`, templateVars);
          const emailSubject = renderTemplateText(annivTmpl?.subject || "Happy Wedding Anniversary! 💐", templateVars);

          if (allowsSms && phone) {
            const smsRes = await sendSms({ recipientPhone: phone, message: smsText });
            await prisma.communicationLog.create({
              data: {
                customerId: cm.id,
                customerName,
                channel: CommunicationChannel.SMS,
                recipient: phone,
                content: smsText,
                status: smsRes.status,
                errorMessage: smsRes.errorMessage,
                triggerType: "AUTOMATED_CRON",
                metadata: JSON.stringify({ event: "ANNIVERSARY" }),
              },
            });
          }

          if (allowsEmail && email) {
            const emailRes = await sendEmail({ to: email, subject: emailSubject, html: emailHtml, text: smsText });
            await prisma.communicationLog.create({
              data: {
                customerId: cm.id,
                customerName,
                channel: CommunicationChannel.EMAIL,
                recipient: email,
                subject: emailSubject,
                content: emailHtml,
                status: emailRes.status,
                errorMessage: emailRes.errorMessage,
                triggerType: "AUTOMATED_CRON",
                metadata: JSON.stringify({ event: "ANNIVERSARY" }),
              },
            });
          }

          anniversariesDispatched++;
          console.log(`💐 [SCHEDULER] Dispatched anniversary wishes to ${customerName}`);
        } catch (err: any) {
          console.error(`❌ [SCHEDULER] Error sending anniversary wish to ${customerName}:`, err.message);
        }
      }
    }
  }

  // Update lastRunAt timestamp
  await prisma.reminderSetting.update({
    where: { id: settings.id },
    data: { lastRunAt: new Date() },
  });

  console.log(`🏁 [SCHEDULER] Completed. Policies Scanned: ${totalPoliciesScanned}, Reminders Sent: ${remindersDispatched}, Birthdays: ${birthdaysDispatched}, Anniversaries: ${anniversariesDispatched}`);

  return {
    status: "COMPLETED",
    totalPoliciesScanned,
    remindersDispatched,
    birthdaysDispatched,
    anniversariesDispatched,
    timestamp: new Date(),
  };
};

/**
 * Get Upcoming Birthdays and Anniversaries within next N days (e.g. 7 or 30 days)
 */
export const getUpcomingCelebrations = async (daysAhead = 30) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const allCustomers = await prisma.customerMaster.findMany({
    include: {
      miscInfo: true,
      contactInfo: true,
      preferences: true,
    },
  });

  const celebrations: Array<{
    id: string;
    customerId: string;
    customerName: string;
    phone?: string;
    email?: string;
    type: "BIRTHDAY" | "ANNIVERSARY";
    originalDate: string;
    upcomingDate: string;
    daysRemaining: number;
    isToday: boolean;
    smsOptedIn: boolean;
    emailOptedIn: boolean;
  }> = [];

  const currentYear = today.getFullYear();

  for (const cm of allCustomers) {
    const customerName = `${cm.salutation ? cm.salutation + " " : ""}${cm.firstName} ${cm.lastName}`.trim();
    const phone = cm.contactInfo?.mobile1 || cm.contactInfo?.mobile2 || undefined;
    const email = cm.contactInfo?.emailPersonal || cm.contactInfo?.emailBusiness || undefined;
    const smsOptedIn = cm.preferences ? cm.preferences.smsMarketing : true;
    const emailOptedIn = cm.preferences ? cm.preferences.emailMarketing : true;

    // 1. Birthday
    const bdayRaw = cm.miscInfo?.dobForGreetings ? new Date(cm.miscInfo.dobForGreetings) : cm.dob ? new Date(cm.dob) : null;
    if (bdayRaw && !isNaN(bdayRaw.getTime())) {
      let nextDate = new Date(currentYear, bdayRaw.getMonth(), bdayRaw.getDate());
      nextDate.setHours(0, 0, 0, 0);
      if (nextDate.getTime() < today.getTime()) {
        nextDate = new Date(currentYear + 1, bdayRaw.getMonth(), bdayRaw.getDate());
        nextDate.setHours(0, 0, 0, 0);
      }
      const diffMs = nextDate.getTime() - today.getTime();
      const daysRemaining = Math.round(diffMs / (1000 * 60 * 60 * 24));

      if (daysRemaining <= daysAhead) {
        celebrations.push({
          id: `bday-${cm.id}`,
          customerId: cm.id,
          customerName,
          phone,
          email,
          type: "BIRTHDAY",
          originalDate: bdayRaw.toISOString(),
          upcomingDate: nextDate.toISOString(),
          daysRemaining,
          isToday: daysRemaining === 0,
          smsOptedIn,
          emailOptedIn,
        });
      }
    }

    // 2. Anniversary
    const annivRaw = cm.miscInfo?.marriageDate ? new Date(cm.miscInfo.marriageDate) : null;
    if (annivRaw && !isNaN(annivRaw.getTime())) {
      let nextDate = new Date(currentYear, annivRaw.getMonth(), annivRaw.getDate());
      nextDate.setHours(0, 0, 0, 0);
      if (nextDate.getTime() < today.getTime()) {
        nextDate = new Date(currentYear + 1, annivRaw.getMonth(), annivRaw.getDate());
        nextDate.setHours(0, 0, 0, 0);
      }
      const diffMs = nextDate.getTime() - today.getTime();
      const daysRemaining = Math.round(diffMs / (1000 * 60 * 60 * 24));

      if (daysRemaining <= daysAhead) {
        celebrations.push({
          id: `anniv-${cm.id}`,
          customerId: cm.id,
          customerName,
          phone,
          email,
          type: "ANNIVERSARY",
          originalDate: annivRaw.toISOString(),
          upcomingDate: nextDate.toISOString(),
          daysRemaining,
          isToday: daysRemaining === 0,
          smsOptedIn,
          emailOptedIn,
        });
      }
    }
  }

  // Sort: closest daysRemaining first
  celebrations.sort((a, b) => a.daysRemaining - b.daysRemaining);

  return celebrations;
};

/**
 * Initialize Background Cron Schedule
 */
export const initScheduler = () => {
  // Run daily at 09:00 AM server time
  cron.schedule("0 9 * * *", async () => {
    console.log("⏰ [CRON TRIGGER] Running scheduled daily insurance reminder scan...");
    try {
      await runSchedulerScan();
    } catch (err: any) {
      console.error("❌ [CRON ERROR]:", err.message);
    }
  });

  console.log("📅 [SCHEDULER] Daily reminder cron initialized (Scheduled for 09:00 AM daily).");
};
