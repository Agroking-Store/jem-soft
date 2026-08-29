import nodemailer from "nodemailer";
import { DeliveryStatus } from "@prisma/client";

export interface EmailSendOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailSendResult {
  status: DeliveryStatus;
  messageId?: string;
  errorMessage?: string;
}

let transporter: nodemailer.Transporter | null = null;

const getTransporter = () => {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }
  return transporter;
};

/**
 * Email Dispatcher
 * Dispatches via real SMTP server if configured in .env,
 * or logs cleanly in simulated development mode.
 */
export const sendEmail = async (options: EmailSendOptions): Promise<EmailSendResult> => {
  const { to, subject, html, text } = options;

  if (!to) {
    return {
      status: DeliveryStatus.FAILED,
      errorMessage: "Recipient email address is missing.",
    };
  }

  const mailTransporter = getTransporter();

  try {
    if (mailTransporter) {
      const from = process.env.SMTP_FROM || `"Jem Soft Insurance" <noreply@jemsoft.com>`;
      const info = await mailTransporter.sendMail({
        from,
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>?/gm, ""),
      });

      return {
        status: DeliveryStatus.SENT,
        messageId: info.messageId,
      };
    }

    // Default: Development Simulator & Logger
    console.log("==================== [EMAIL DISPATCH SIMULATOR] ====================");
    console.log(`📧 TO: ${to}`);
    console.log(`📌 SUBJECT: ${subject}`);
    console.log(`📝 PREVIEW:`);
    console.log(text || html.replace(/<[^>]*>?/gm, "").substring(0, 300) + "...");
    console.log("====================================================================");

    return {
      status: DeliveryStatus.SENT,
      messageId: `SIM_EMAIL_${Date.now()}`,
    };
  } catch (error: any) {
    console.error("Email Dispatch Error:", error);
    return {
      status: DeliveryStatus.FAILED,
      errorMessage: error.message || "Unknown Email error",
    };
  }
};
