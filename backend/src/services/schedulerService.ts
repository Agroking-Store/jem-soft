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

  // 2. SCAN FOR BIRTHDAYS (if enabled)
  if (settings.isBirthdayWishesEnabled) {
    const currentMonth = today.getMonth() + 1; // 1-12
    const currentDay = today.getDate(); // 1-31

    const customersWithMisc = await prisma.customerMaster.findMany({
      where: {
        miscInfo: {
          dobForGreetings: { not: null },
        },
      },
      include: {
        miscInfo: true,
        preferences: true,
        contactInfo: true,
      },
    });

    for (const cm of customersWithMisc) {
      if (!cm.miscInfo?.dobForGreetings) continue;

      const dob = new Date(cm.miscInfo.dobForGreetings);
      if (dob.getMonth() + 1 === currentMonth && dob.getDate() === currentDay) {
        // It's their birthday!
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
      }
    }
  }

  // Update lastRunAt timestamp
  await prisma.reminderSetting.update({
    where: { id: settings.id },
    data: { lastRunAt: new Date() },
  });

  console.log(`🏁 [SCHEDULER] Completed. Policies Scanned: ${totalPoliciesScanned}, Reminders Sent: ${remindersDispatched}, Birthdays Sent: ${birthdaysDispatched}`);

  return {
    status: "COMPLETED",
    totalPoliciesScanned,
    remindersDispatched,
    birthdaysDispatched,
    timestamp: new Date(),
  };
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
