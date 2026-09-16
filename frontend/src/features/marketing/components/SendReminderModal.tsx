"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  BellRing,
  Smartphone,
  Mail,
  MessageSquare,
  Send,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";
import { sendReminderApi, getTemplatesApi } from "../services/marketingApi";
import { NotificationTemplate } from "../types";

interface SendReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  policy: {
    id: string;
    policyNumber: string;
    nextPremiumDueDate?: string | null;
    premium?: {
      totalInstallmentPremium?: number | string | null;
      installmentPremium?: number | string | null;
    } | null;
    product?: { productName?: string } | null;
    provider?: { name?: string } | null;
    CustomerMaster?: {
      firstName?: string;
      lastName?: string;
      contactInfo?: { mobile1?: string; emailPersonal?: string } | null;
      preferences?: { smsMarketing?: boolean; emailMarketing?: boolean } | null;
    } | null;
  };
  onSuccess?: () => void;
}

export const SendReminderModal: React.FC<SendReminderModalProps> = ({
  isOpen,
  onClose,
  policy,
  onSuccess,
}) => {
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [selectedTemplateCode, setSelectedTemplateCode] = useState<string>("PREMIUM_DUE_ADVANCE");
  const [customMessage, setCustomMessage] = useState<string>("");
  const [customSubject, setCustomSubject] = useState<string>("");

  // Separate loading states for each channel
  const [sendingEmail, setSendingEmail] = useState(false);
  const [sendingWhatsapp, setSendingWhatsapp] = useState(false);
  const [sendingAll, setSendingAll] = useState(false);

  const customer = policy?.CustomerMaster;
  const customerName =
    `${customer?.firstName || ""} ${customer?.lastName || ""}`.trim() || "Valued Customer";
  const mobile = customer?.contactInfo?.mobile1 || "";
  const email = customer?.contactInfo?.emailPersonal || "Not specified";
  const whatsappOptedIn = customer?.preferences ? customer.preferences.smsMarketing : true;
  const emailOptedIn = customer?.preferences ? customer.preferences.emailMarketing : true;

  const premiumAmount =
    policy?.premium?.totalInstallmentPremium ||
    policy?.premium?.installmentPremium ||
    "0.00";

  const formattedDueDate = policy?.nextPremiumDueDate
    ? new Date(policy.nextPremiumDueDate).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "N/A";

  useEffect(() => {
    if (isOpen) {
      getTemplatesApi()
        .then((res) => {
          if (res.success && res.data) setTemplates(res.data);
        })
        .catch((err) => console.error("Templates fetch error:", err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentTemplate = templates.find((t) => t.code === selectedTemplateCode);

  const previewWhatsapp =
    customMessage ||
    (currentTemplate?.smsBody
      ? currentTemplate.smsBody
          .replace("{customer_name}", customerName)
          .replace("{policy_number}", policy.policyNumber)
          .replace("{plan_name}", policy.product?.productName || "Insurance Plan")
          .replace("{provider_name}", policy.provider?.name || "LIC")
          .replace("{premium_amount}", String(premiumAmount))
          .replace("{due_date}", formattedDueDate)
          .replace("{due_days}", "7")
          .replace("{advisor_name}", "Your Insurance Advisor")
          .replace("{advisor_phone}", "+91-9876543210")
      : "");

  // ── Channel-specific send handler ──────────────────────────────────────
  const handleSend = async (channel: "EMAIL" | "WHATSAPP" | "ALL") => {
    if (channel === "EMAIL") setSendingEmail(true);
    if (channel === "WHATSAPP") setSendingWhatsapp(true);
    if (channel === "ALL") setSendingAll(true);

    try {
      const res = await sendReminderApi({
        policyId: policy.id,
        templateCode: selectedTemplateCode,
        customMessage: customMessage || undefined,
        customSubject: customSubject || undefined,
        channel,
      });

      if (res.success) {
        const channelLabel = channel === "ALL" ? "WhatsApp & Email" : channel;
        toast.success(`Dispatched ${channelLabel} reminder for policy ${policy.policyNumber}!`);
        if (onSuccess) onSuccess();
      } else {
        toast.error(res.message || `Failed to send ${channel}`);
      }
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || err.message || `Failed to send ${channel}`
      );
    } finally {
      if (channel === "EMAIL") setSendingEmail(false);
      if (channel === "WHATSAPP") setSendingWhatsapp(false);
      if (channel === "ALL") setSendingAll(false);
    }
  };

  // ── WhatsApp click-to-chat ──────────────────────────────────────────────
  const handleOpenWhatsApp = () => {
    if (!mobile) {
      toast.error("Customer has no mobile number registered.");
      return;
    }
    const clean = mobile.replace(/\D/g, "");
    const phone = clean.length === 10 ? `91${clean}` : clean;
    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(previewWhatsapp)}`,
      "_blank"
    );
  };

  // ── Pill helper ─────────────────────────────────────────────────────────
  const optPill = (active: boolean | undefined, label: string, Icon: any) => (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
        active
          ? "text-emerald-700 bg-emerald-50 border-emerald-200"
          : "text-amber-700 bg-amber-50 border-amber-200"
      }`}
    >
      <Icon size={11} />
      {label}: {active ? "Active" : "Opted Out"}
    </span>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <BellRing size={18} />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#0B1220]">
                Send Policy Due Reminder
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Policy #{policy.policyNumber} • {customerName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Policy Summary Box */}
          <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-slate-400 font-medium">Customer:</span>
              <p className="font-semibold text-slate-800">{customerName}</p>
              <p className="text-slate-500 text-[11px] font-mono">{mobile || "No phone"}</p>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Plan / Product:</span>
              <p className="font-semibold text-slate-800">
                {policy.product?.productName || "Standard Plan"}
              </p>
              <p className="text-slate-500 text-[11px]">{policy.provider?.name || "LIC"}</p>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Installment Premium:</span>
              <p className="font-bold text-amber-600 text-sm">₹{String(premiumAmount)}</p>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Due Date:</span>
              <p className="font-bold text-rose-600">{formattedDueDate}</p>
            </div>
          </div>

          {/* Preferences Banner */}
          <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs bg-slate-50 border-slate-200">
            <span className="font-semibold text-slate-700 uppercase tracking-wider text-[10px]">
              Service Preferences:
            </span>
            <div className="flex items-center gap-2">
              {optPill(whatsappOptedIn, "WhatsApp", MessageSquare)}
              {optPill(emailOptedIn, "Email", Mail)}
            </div>
          </div>

          {/* Template Selection */}
          <div>
            <label className="block text-xs font-semibold text-[#0B1220] uppercase tracking-wider mb-2">
              Select Message Template
            </label>
            <select
              value={selectedTemplateCode}
              onChange={(e) => setSelectedTemplateCode(e.target.value)}
              className="w-full text-sm rounded-xl border border-slate-300 px-3.5 py-2.5 bg-white focus:ring-2 focus:ring-[#B8873A] focus:border-[#B8873A] transition-all font-medium text-slate-800"
            >
              {templates.map((t) => (
                <option key={t.id} value={t.code}>
                  {t.name} ({t.category})
                </option>
              ))}
            </select>
          </div>

          {/* Dynamic Preview */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-semibold text-[#0B1220] uppercase tracking-wider">
                WhatsApp Message Preview
              </label>
              <span className="text-slate-400 text-xs font-mono">{previewWhatsapp.length} chars</span>
            </div>
            <div className="p-4 bg-[#0B1220] text-slate-100 rounded-xl text-xs font-mono whitespace-pre-wrap leading-relaxed border border-slate-800 shadow-inner min-h-[90px]">
              {previewWhatsapp || <span className="text-slate-500 italic">Select a template above…</span>}
            </div>
          </div>
        </div>

        {/* ── Footer: Action buttons ───────────────────────── */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200">
          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-3">
            Choose channel to send
          </p>
          <div className="flex flex-wrap gap-2.5 items-center justify-between">
            {/* Left: channel buttons */}
            <div className="flex flex-wrap gap-2">
              {/* Both WhatsApp + Email */}
              <button
                type="button"
                onClick={() => handleSend("ALL")}
                disabled={sendingAll || (!whatsappOptedIn && !emailOptedIn)}
                title="Send both WhatsApp and Email reminders automatically"
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed
                  bg-gradient-to-r from-[#1877F2] to-[#2563eb] hover:brightness-110 text-white shadow-sm shadow-blue-500/30"
              >
                {sendingAll ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <BellRing size={14} />
                )}
                {sendingAll ? "Sending All…" : "Send WhatsApp & Email"}
              </button>

              {/* WhatsApp (Automated) */}
              <button
                type="button"
                onClick={() => handleSend("WHATSAPP")}
                disabled={sendingWhatsapp || !whatsappOptedIn || !mobile}
                title={!mobile ? "No mobile number" : !whatsappOptedIn ? "Customer opted out of WhatsApp" : "Send automated WhatsApp reminder"}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed
                  bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/30"
              >
                {sendingWhatsapp ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <MessageSquare size={14} />
                )}
                {sendingWhatsapp ? "Sending…" : "Send WhatsApp"}
              </button>

              {/* Email */}
              <button
                type="button"
                onClick={() => handleSend("EMAIL")}
                disabled={sendingEmail || !emailOptedIn || email === "Not specified"}
                title={email === "Not specified" ? "No email on file" : !emailOptedIn ? "Customer opted out of Email" : "Send Email"}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed
                  bg-amber-600 hover:bg-amber-700 text-white shadow-sm shadow-amber-600/30"
              >
                {sendingEmail ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Mail size={14} />
                )}
                {sendingEmail ? "Sending…" : "Send Email"}
              </button>

              {/* WhatsApp Web Direct Chat */}
              <button
                type="button"
                onClick={handleOpenWhatsApp}
                disabled={!mobile}
                title={!mobile ? "No mobile number" : "Open in WhatsApp Web"}
                className="inline-flex items-center gap-2 px-3 py-2.5 text-xs font-semibold rounded-xl transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed
                  bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300"
              >
                <MessageSquare size={13} className="text-emerald-600" />
                Open Chat
              </button>
            </div>

            {/* Right: Cancel */}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>

          {/* Channel legend */}
          <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-slate-400">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> All → WhatsApp + Email</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> WhatsApp → Automatic Dispatch</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Email → Gmail SMTP</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-500 inline-block" /> Open Chat → WhatsApp Web</span>
          </div>
        </div>
      </div>
    </div>
  );
};
