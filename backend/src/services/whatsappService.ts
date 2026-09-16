import { DeliveryStatus } from "@prisma/client";

export interface WhatsappSendOptions {
  recipientPhone: string;
  message: string;
  templateCode?: string;
  mediaUrl?: string;
}

export interface WhatsappSendResult {
  status: DeliveryStatus;
  messageId?: string;
  errorMessage?: string;
}

/**
 * Format phone number into international standard without symbols (e.g. 919876543210)
 */
export const formatPhoneNumber = (phone: string): string => {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `91${digits}`; // Default to India country code if 10 digits
  }
  return digits;
};

/**
 * WhatsApp Dispatcher
 * Supports:
 * 1. Free Local WhatsApp Web Gateway (Baileys / WPPConnect / HTTP QR Gateway) -> 100% FREE using your own WhatsApp
 * 2. Meta WhatsApp Cloud API -> 1,000 free conversations/month official from Meta
 * 3. Fallback Development Simulator & wa.me logger
 */
export const sendWhatsapp = async (
  options: WhatsappSendOptions
): Promise<WhatsappSendResult> => {
  const { recipientPhone, message } = options;

  if (!recipientPhone) {
    return {
      status: DeliveryStatus.FAILED,
      errorMessage: "Recipient phone number is missing.",
    };
  }

  const cleanPhone = formatPhoneNumber(recipientPhone);
  const whatsappProvider = (process.env.WHATSAPP_PROVIDER || "GATEWAY").toUpperCase();

  try {
    // ──────────────────────────────────────────────────────────────────────────
    // 1. FREE LOCAL WHATSAPP WEB GATEWAY (WPPConnect / Baileys / Local HTTP)
    // Runs on your machine or VPS, links via QR code once, sends unlimited FREE messages!
    // .env: WHATSAPP_PROVIDER=GATEWAY, WHATSAPP_API_URL=http://localhost:3333/message/text
    // ──────────────────────────────────────────────────────────────────────────
    if (whatsappProvider === "GATEWAY" && process.env.WHATSAPP_API_URL) {
      const rawUrl = process.env.WHATSAPP_API_URL.trim().replace(/\/$/, "");
      const session = process.env.WHATSAPP_SESSION?.trim() || "Jemsoft";
      const rawKey = process.env.WHATSAPP_API_KEY || "";

      // Intelligently resolve endpoint for WPPConnect or generic gateway
      let targetUrl = rawUrl;
      if (!targetUrl.includes("/send-message") && !targetUrl.includes("/message")) {
        targetUrl = `${rawUrl}/api/${session}/send-message`;
      }

      // Extract clean Bearer token if formatted as "session:token"
      let token = rawKey.trim();
      if (token.includes(":") && !token.startsWith("http")) {
        token = token.split(":").slice(1).join(":").trim();
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
        headers["x-api-key"] = token;
      }

      console.log(`[WhatsApp Gateway] Dispatching to ${targetUrl} for ${cleanPhone}`);

      const response = await fetch(targetUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          phone: cleanPhone,
          number: `${cleanPhone}@c.us`,
          message,
          text: message,
        }),
      });

      if (response.ok) {
        const data: any = await response.json().catch(() => ({}));
        console.log(`[WhatsApp Gateway Success]:`, data?.status || "SENT");
        return {
          status: DeliveryStatus.SENT,
          messageId: data.id || data.messageId || data?.response?.[0]?.id || `WA_GW_${Date.now()}`,
        };
      } else {
        const errText = await response.text();
        console.warn(`[WhatsApp Gateway Warning (${response.status})]: ${errText}`);
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 2. META WHATSAPP CLOUD API (Official Free Tier - 1,000 free service convos/month)
    // .env: WHATSAPP_PROVIDER=META, WHATSAPP_PHONE_NUMBER_ID=xxx, WHATSAPP_ACCESS_TOKEN=xxx
    // ──────────────────────────────────────────────────────────────────────────
    if (
      whatsappProvider === "META" &&
      process.env.WHATSAPP_PHONE_NUMBER_ID &&
      process.env.WHATSAPP_ACCESS_TOKEN
    ) {
      const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
      const token = process.env.WHATSAPP_ACCESS_TOKEN;

      const response = await fetch(
        `https://graph.facebook.com/v19.0/${phoneId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: cleanPhone,
            type: "text",
            text: { preview_url: false, body: message },
          }),
        }
      );

      const data: any = await response.json();
      if (response.ok && data.messages?.[0]?.id) {
        return {
          status: DeliveryStatus.SENT,
          messageId: data.messages[0].id,
        };
      } else {
        return {
          status: DeliveryStatus.FAILED,
          errorMessage:
            data.error?.message || "Meta WhatsApp Cloud API dispatch failed",
        };
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 3. DEVELOPMENT / SIMULATOR FALLBACK
    // Logs cleanly to console and provides direct click-to-chat wa.me link
    // ──────────────────────────────────────────────────────────────────────────
    console.log("==================== [WHATSAPP DISPATCH SIMULATOR] ====================");
    console.log(`📱 RECIPIENT: +${cleanPhone}`);
    console.log(`💬 MESSAGE:`);
    console.log(message);
    console.log(`🔗 DIRECT CHAT URL: https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`);
    console.log("=======================================================================");

    return {
      status: DeliveryStatus.SENT,
      messageId: `SIM_WA_${Date.now()}`,
    };
  } catch (error: any) {
    console.error("WhatsApp Dispatch Error:", error);
    return {
      status: DeliveryStatus.FAILED,
      errorMessage: error.message || "Unknown WhatsApp dispatch error",
    };
  }
};
