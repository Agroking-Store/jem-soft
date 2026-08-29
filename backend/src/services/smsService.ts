import { DeliveryStatus } from "@prisma/client";

export interface SmsSendOptions {
  recipientPhone: string;
  message: string;
  senderId?: string;
}

export interface SmsSendResult {
  status: DeliveryStatus;
  messageId?: string;
  errorMessage?: string;
}

/**
 * SMS Dispatcher
 * Dispatches via real provider (Fast2SMS / MSG91 / Twilio) if configured,
 * or logs cleanly in simulated development mode.
 */
export const sendSms = async (options: SmsSendOptions): Promise<SmsSendResult> => {
  const { recipientPhone, message } = options;

  if (!recipientPhone) {
    return {
      status: DeliveryStatus.FAILED,
      errorMessage: "Recipient phone number is missing.",
    };
  }

  // Check for SMS API credentials in environment
  const smsProvider = process.env.SMS_PROVIDER; // 'FAST2SMS' | 'MSG91' | 'TWILIO' | undefined
  const smsApiKey = process.env.SMS_API_KEY;

  try {
    if (smsProvider === "FAST2SMS" && smsApiKey) {
      // Example Fast2SMS integration
      const response = await fetch("https://www.fast2sms.com/dev/bulkV2", {
        method: "POST",
        headers: {
          authorization: smsApiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          route: "v3",
          sender_id: process.env.SMS_SENDER_ID || "TXTIND",
          message: message,
          language: "english",
          flash: 0,
          numbers: recipientPhone.replace(/\D/g, ""),
        }),
      });

      const data: any = await response.json();
      if (data.return) {
        return { status: DeliveryStatus.SENT, messageId: data.request_id };
      } else {
        return {
          status: DeliveryStatus.FAILED,
          errorMessage: data.message || "Fast2SMS dispatch failed",
        };
      }
    }

    // ──────────────────────────────────────────────────────────────
    // MSG91 Integration (India – 500 free trial SMS)
    // Sign up at https://msg91.com → get authkey from API → DLT registration for template
    // .env: SMS_PROVIDER=MSG91, SMS_API_KEY=<authkey>, MSG91_SENDER_ID=<6-char-sender>, MSG91_TEMPLATE_ID=<dlt-template-id>
    // ──────────────────────────────────────────────────────────────
    if (smsProvider === "MSG91" && smsApiKey) {
      const senderId   = process.env.MSG91_SENDER_ID   || "JEMSFT";
      const templateId = process.env.MSG91_TEMPLATE_ID || "";
      const toNumber   = recipientPhone.replace(/\D/g, "");

      const response = await fetch("https://api.msg91.com/api/v5/flow/", {
        method: "POST",
        headers: {
          authkey: smsApiKey,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          template_id: templateId,
          sender: senderId,
          short_url: "0",
          mobiles: `91${toNumber.length === 10 ? toNumber : toNumber}`,
          // pass template variables here if your DLT template has placeholders
          message,
        }),
      });

      const data: any = await response.json();
      if (data.type === "success") {
        return { status: DeliveryStatus.SENT, messageId: data.request_id };
      } else {
        return {
          status: DeliveryStatus.FAILED,
          errorMessage: data.message || "MSG91 dispatch failed",
        };
      }
    }

    // ──────────────────────────────────────────────────────────────
    // TWILIO Integration
    // ──────────────────────────────────────────────────────────────
    if (smsProvider === "TWILIO") {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken  = process.env.TWILIO_AUTH_TOKEN;
      const fromNumber = process.env.TWILIO_PHONE_NUMBER;

      if (!accountSid || !authToken || !fromNumber) {
        console.error("[Twilio] Missing TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_PHONE_NUMBER in .env");
        return {
          status: DeliveryStatus.FAILED,
          errorMessage: "Twilio credentials not configured.",
        };
      }

      // Ensure recipient has + prefix
      const toNumber = recipientPhone.startsWith("+")
        ? recipientPhone
        : `+${recipientPhone}`;

      const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

      const body = new URLSearchParams({
        From: fromNumber,
        To:   toNumber,
        Body: message,
      });

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization:
            "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
        },
        body: body.toString(),
      });

      const data: any = await response.json();

      if (response.ok && data.sid) {
        console.log(`[Twilio] SMS sent successfully. SID: ${data.sid}`);
        return { status: DeliveryStatus.SENT, messageId: data.sid };
      } else {
        console.error("[Twilio] Error response:", data);
        return {
          status: DeliveryStatus.FAILED,
          errorMessage: data.message || `Twilio error code ${data.code}`,
        };
      }
    }

    // Default: Development Simulator & Logger
    console.log("==================== [SMS DISPATCH SIMULATOR] ====================");
    console.log(`📱 TO: ${recipientPhone}`);
    console.log(`💬 MESSAGE:`);
    console.log(message);
    console.log("==================================================================");

    return {
      status: DeliveryStatus.SENT,
      messageId: `SIM_SMS_${Date.now()}`,
    };
  } catch (error: any) {
    console.error("SMS Dispatch Error:", error);
    return {
      status: DeliveryStatus.FAILED,
      errorMessage: error.message || "Unknown SMS error",
    };
  }
};
