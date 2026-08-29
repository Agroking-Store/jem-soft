"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  BellRing,
  Smartphone,
  Mail,
  MessageSquare,
  Send,
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

  const customer = policy?.CustomerMaster;
  const customerName =
    `${customer?.firstName || ""} ${customer?.lastName || ""}`.trim() || "Valued Customer";
  const mobile = customer?.contactInfo?.mobile1 || "";
  const email = customer?.contactInfo?.emailPersonal || "Not specified";
  const smsOptedIn = customer?.preferences ? customer.preferences.smsMarketing : true;
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

  const previewSms =
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
  const handleSend = async (channel: "EMAIL") => {
    setSendingEmail(true);
    try {
      const res = await sendReminderApi({
        policyId: policy.id,
        templateCode: selectedTemplateCode,
        customMessage: customMessage || undefined,
        customSubject: customSubject || undefined,
        channel,
      });

      if (res.success) {
        toast.success(`📧 Email dispatched for policy ${policy.policyNumber}!`);
        if (onSuccess) onSuccess();
      } else {
        toast.error(res.message || "Failed to send Email");
      }
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || err.message || "Failed to send Email"
      );
    } finally {
      setSendingEmail(false);
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
      `https://wa.me/${phone}?text=${encodeURIComponent(previewSms)}`,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden transform transition-all">
        {/* Gold Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#E8C77A] to-transparent" />

        {/* Header */}
        <div className="bg-gradient-to-r from-[#0B1220] via-[#132342] to-[#16294D] p-5 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#B8873A]/20 rounded-xl border border-[#B8873A]/40 text-[#E8C77A]">
              <BellRing size={20} />
            </div>
            <div>
              <h3 className="font-serif font-semibold text-lg text-[#E8C77A]">
                Send Premium Due Reminder
              </h3>
              <p className="text-xs text-slate-300">
                Policy: {policy.policyNumber} | Due: {formattedDueDate}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Customer & Policy Summary */}
          <div className="bg-[#0B1220]/5 rounded-xl p-4 border border-[#B8873A]/20 grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                Customer
              </span>
              <p className="font-serif font-bold text-slate-900 text-sm">{customerName}</p>
              <p className="text-slate-600 font-mono mt-0.5">{mobile || "No Mobile"}</p>
            </div>
            <div>
              <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                Installment Premium
              </span>
              <p className="font-bold text-[#B8873A] text-base">
                ₹ {Number(premiumAmount).toLocaleString("en-IN")}
              </p>
              <p className="text-slate-500 truncate mt-0.5">{email}</p>
            </div>
          </div>

          {/* Preferences Banner */}
          <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs bg-slate-50 border-slate-200">
            <span className="font-semibold text-slate-700 uppercase tracking-wider text-[10px]">
              Service Preferences:
            </span>
            <div className="flex items-center gap-2">
              {optPill(smsOptedIn, "SMS", Smartphone)}
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
                Message Preview
              </label>
              <span className="text-slate-400 text-xs font-mono">{previewSms.length} chars</span>
            </div>
            <div className="p-4 bg-[#0B1220] text-slate-100 rounded-xl text-xs font-mono leading-relaxed border border-slate-800 shadow-inner min-h-[72px]">
              {previewSms || <span className="text-slate-500 italic">Select a template above…</span>}
            </div>
          </div>
        </div>

        {/* ── Footer: 3 separate action buttons ───────────────────────── */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200">
          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-3">
            Choose channel to send
          </p>
          <div className="flex flex-wrap gap-2.5 items-center justify-between">
            {/* Left: channel buttons */}
            <div className="flex flex-wrap gap-2">
              {/* SMS – Coming Soon */}
              <button
                type="button"
                disabled
                title="SMS integration coming soon"
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl
                  bg-slate-200 text-slate-400 cursor-not-allowed relative"
              >
                <Smartphone size={14} />
                Send SMS
                <span className="absolute -top-2 -right-2 text-[9px] font-bold bg-slate-500 text-white px-1.5 py-0.5 rounded-full leading-none">
                  Soon
                </span>
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

              {/* WhatsApp */}
              <button
                type="button"
                onClick={handleOpenWhatsApp}
                disabled={!mobile}
                title={!mobile ? "No mobile number" : "Open WhatsApp"}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed
                  bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/30"
              >
                <MessageSquare size={14} />
                WhatsApp
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
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-300 inline-block" /> SMS → Coming Soon</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Email → Gmail SMTP</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> WhatsApp → Click-to-chat</span>
          </div>
        </div>
      </div>
    </div>
  );
};
