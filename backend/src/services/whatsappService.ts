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

        // Auto-refresh token if expired (401) and secret key is present
        if (response.status === 401 && process.env.WPPCONNECT_SECRET_KEY) {
          try {
            console.log(`[WhatsApp Gateway] Refreshing token for session ${session}...`);
            const refreshRes = await fetch(
              `${rawUrl}/api/${session}/${process.env.WPPCONNECT_SECRET_KEY}/generate-token`,
              { method: "POST" }
            );
            const refreshData: any = await refreshRes.json().catch(() => ({}));
            if (refreshData?.token) {
              const freshToken = refreshData.token;
              headers["Authorization"] = `Bearer ${freshToken}`;
              headers["x-api-key"] = freshToken;

              const retryRes = await fetch(targetUrl, {
                method: "POST",
                headers,
                body: JSON.stringify({
                  phone: cleanPhone,
                  number: `${cleanPhone}@c.us`,
                  message,
                  text: message,
                }),
              });

              if (retryRes.ok) {
                const retryData: any = await retryRes.json().catch(() => ({}));
                return {
                  status: DeliveryStatus.SENT,
                  messageId: retryData.id || retryData.messageId || retryData?.response?.[0]?.id || `WA_GW_${Date.now()}`,
                };
              }
            }
          } catch (refreshErr) {
            console.error("[WhatsApp Gateway] Auto-refresh token failed:", refreshErr);
          }
        }

        return {
          status: DeliveryStatus.FAILED,
          errorMessage: `WhatsApp Gateway returned HTTP ${response.status}: ${errText}`,
        };
      }
    }

    return {
      status: DeliveryStatus.FAILED,
      errorMessage: "WhatsApp gateway URL is not configured.",
    };
  } catch (error: any) {
    console.error("WhatsApp Dispatch Error:", error);
    return {
      status: DeliveryStatus.FAILED,
      errorMessage: error.message || "Unknown WhatsApp dispatch error",
    };
  }
};
