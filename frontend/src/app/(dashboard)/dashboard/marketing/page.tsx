"use client";

import React, { useState, useEffect } from "react";
import {
  Megaphone,
  Mail,
  Smartphone,
  Calendar,
  Clock,
  Send,
  Settings,
  History,
  FileText,
  Play,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Plus,
  Filter,
  Search,
  Users,
  ShieldCheck,
  Sparkles,
  Gift,
  Heart,
  ChevronLeft,
  ChevronRight,
  UserCheck,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  getCommunicationLogsApi,
  getReminderSettingsApi,
  updateReminderSettingsApi,
  getTemplatesApi,
  updateTemplateApi,
  runSchedulerScanApi,
  getCampaignsApi,
  createCampaignApi,
  sendCampaignApi,
  getAudienceEstimationApi,
  getUpcomingCelebrationsApi,
  sendDirectMessageApi,
} from "@/features/marketing/services/marketingApi";
import {
  CommunicationLog,
  NotificationTemplate,
  ReminderSetting,
  MarketingCampaign,
  CelebrationItem,
} from "@/features/marketing/types";
import {
  CustomerPageHero,
  CustomerSectionCard,
  CustomerStatCard,
  CustomerTableFrame,
} from "@/features/customers/components/CustomerUi";

type TabType = "overview" | "campaigns" | "templates" | "settings" | "logs";

export default function MarketingPage() {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Settings State
  const [settings, setSettings] = useState<ReminderSetting | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState<boolean>(false);

  // Templates State
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<NotificationTemplate | null>(null);
  const [templateFilter, setTemplateFilter] = useState<string>("ALL");

  // Campaigns State
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [audienceCount, setAudienceCount] = useState<{ totalMembers: number; smsEligible: number; emailEligible: number } | null>(null);
  const [showNewCampaignModal, setShowNewCampaignModal] = useState<boolean>(false);
  const [newCampaignTitle, setNewCampaignTitle] = useState<string>("");
  const [newCampaignChannel, setNewCampaignChannel] = useState<"ALL" | "SMS" | "EMAIL">("ALL");
  const [newCampaignTemplateId, setNewCampaignTemplateId] = useState<string>("");
  const [newCampaignCustomMessage, setNewCampaignCustomMessage] = useState<string>("");
  const [isBroadcasting, setIsBroadcasting] = useState<string | null>(null);

  // Celebrations State
  const [celebrations, setCelebrations] = useState<CelebrationItem[]>([]);
  const [celebrationDaysFilter, setCelebrationDaysFilter] = useState<number>(30);
  const [celebrationTypeFilter, setCelebrationTypeFilter] = useState<"ALL" | "BIRTHDAY" | "ANNIVERSARY">("ALL");
  const [isWishingCustomer, setIsWishingCustomer] = useState<string | null>(null);

  // Logs State
  const [logs, setLogs] = useState<CommunicationLog[]>([]);
  const [logsTotal, setLogsTotal] = useState<number>(0);
  const [logsPage, setLogsPage] = useState<number>(1);
  const [logsTotalPages, setLogsTotalPages] = useState<number>(1);
  const [logsSearch, setLogsSearch] = useState<string>("");
  const [logsChannel, setLogsChannel] = useState<string>("");
  const [logsStatus, setLogsStatus] = useState<string>("");
  const [isLogsLoading, setIsLogsLoading] = useState<boolean>(false);

  // Scan status
  const [isScanning, setIsScanning] = useState<boolean>(false);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [settingsRes, templatesRes, campaignsRes, audienceRes, logsRes, celebrationsRes] = await Promise.all([
        getReminderSettingsApi().catch(() => ({ success: false, data: null })),
        getTemplatesApi().catch(() => ({ success: false, data: [] })),
        getCampaignsApi().catch(() => ({ success: false, data: [] })),
        getAudienceEstimationApi().catch(() => ({ success: false, data: null })),
        getCommunicationLogsApi({ page: 1, limit: 10 }).catch(() => ({ success: false, data: { logs: [], total: 0, page: 1, totalPages: 1 } })),
        getUpcomingCelebrationsApi(30).catch(() => ({ success: false, data: [] })),
      ]);

      if (settingsRes.data) setSettings(settingsRes.data);
      if (templatesRes.data) {
        setTemplates(templatesRes.data);
        if (templatesRes.data.length > 0) setSelectedTemplate(templatesRes.data[0]);
      }
      if (campaignsRes.data) setCampaigns(campaignsRes.data);
      if (audienceRes.data) setAudienceCount(audienceRes.data);
      if (celebrationsRes.data) setCelebrations(celebrationsRes.data);
      if (logsRes.data) {
        setLogs(logsRes.data.logs);
        setLogsTotal(logsRes.data.total);
        setLogsPage(logsRes.data.page);
        setLogsTotalPages(logsRes.data.totalPages);
      }
    } catch (err: any) {
      toast.error("Failed to load marketing data.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunScan = async () => {
    setIsScanning(true);
    try {
      const res = await runSchedulerScanApi();
      if (res.success) {
        toast.success(
          `Auto scan complete! Scanned: ${res.data.totalPoliciesScanned}, Dues: ${res.data.remindersDispatched}, Birthdays: ${res.data.birthdaysDispatched || 0}, Anniversaries: ${res.data.anniversariesDispatched || 0}`
        );
        loadAllData();
      }
    } catch (err: any) {
      toast.error("Scheduler scan failed.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!settings) return;
    setIsSavingSettings(true);
    try {
      const res = await updateReminderSettingsApi(settings);
      if (res.success) {
        setSettings(res.data);
        toast.success("Automated rules saved successfully!");
      }
    } catch (err: any) {
      toast.error("Failed to update settings.");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!selectedTemplate) return;
    try {
      const res = await updateTemplateApi(selectedTemplate.id, selectedTemplate);
      if (res.success) {
        toast.success("Template updated successfully!");
        setTemplates((prev) => prev.map((t) => (t.id === selectedTemplate.id ? res.data : t)));
      }
    } catch (err: any) {
      toast.error("Failed to save template.");
    }
  };

  const handleCreateCampaign = async () => {
    if (!newCampaignTitle.trim()) {
      toast.error("Please enter a campaign title.");
      return;
    }

    try {
      const res = await createCampaignApi({
        title: newCampaignTitle,
        channel: newCampaignChannel as any,
        templateId: newCampaignTemplateId || undefined,
        customMessage: newCampaignCustomMessage || undefined,
      });

      if (res.success) {
        toast.success("Campaign created successfully!");
        setShowNewCampaignModal(false);
        setNewCampaignTitle("");
        setNewCampaignCustomMessage("");
        const campRes = await getCampaignsApi();
        if (campRes.data) setCampaigns(campRes.data);
      }
    } catch (err: any) {
      toast.error("Failed to create campaign.");
    }
  };

  const handleSendCampaign = async (id: string, title: string) => {
    const confirmed = window.confirm(
      `Broadcast "${title}" to all opted-in customers? Deliveries will be sent safely in batches of 25 to prevent rate limits.`
    );
    if (!confirmed) return;

    setIsBroadcasting(id);
    const toastId = toast.loading("Broadcasting campaign safely in batches of 25...");
    try {
      const res = await sendCampaignApi(id);
      toast.dismiss(toastId);
      if (res.success) {
        toast.success(`Campaign broadcast completed! (${res.data.successfulCount} delivered)`);
        const campRes = await getCampaignsApi();
        if (campRes.data) setCampaigns(campRes.data);
        loadAllData();
      }
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error("Failed to broadcast campaign.");
    } finally {
      setIsBroadcasting(null);
    }
  };

  const handleSendDirectWish = async (item: CelebrationItem) => {
    const wishType = item.type === "BIRTHDAY" ? "Birthday" : "Wedding Anniversary";
    setIsWishingCustomer(item.id);
    try {
      const message =
        item.type === "BIRTHDAY"
          ? `Warmest Birthday wishes to ${item.customerName}! May this year bring you joy, health, and prosperity. - Your Insurance Advisor`
          : `Warmest Wedding Anniversary congratulations to ${item.customerName}! Wishing you a lifetime of love and happiness together. - Your Insurance Advisor`;

      const res = await sendDirectMessageApi({
        customerId: item.customerId,
        channel: "ALL",
        subject: `Happy ${wishType} from Your Insurance Advisor!`,
        message,
      });

      if (res.success) {
        toast.success(`${wishType} sent to ${item.customerName} via SMS & Email!`);
        setCelebrations((prev) =>
          prev.map((c) => (c.id === item.id ? { ...c, alreadySentToday: true } : c))
        );
        loadAllData();
      }
    } catch (err: any) {
      toast.error(`Failed to send ${wishType} wish.`);
    } finally {
      setIsWishingCustomer(null);
    }
  };

  const fetchFilteredLogs = async (page = 1) => {
    setIsLogsLoading(true);
    try {
      const res = await getCommunicationLogsApi({
        page,
        limit: 10,
        search: logsSearch || undefined,
        channel: logsChannel || undefined,
        status: logsStatus || undefined,
      });
      if (res.data) {
        setLogs(res.data.logs);
        setLogsTotal(res.data.total);
        setLogsPage(res.data.page);
        setLogsTotalPages(res.data.totalPages);
      }
    } catch (err) {
      toast.error("Failed to filter logs");
    } finally {
      setIsLogsLoading(false);
    }
  };

  // Filtered Celebrations - also exclude items where isToday && alreadySentToday (already auto-dispatched today)
  // After tomorrow they won't appear because daysRemaining becomes negative (backend only returns <= daysAhead)
  const filteredCelebrations = celebrations.filter((c) => {
    if (c.daysRemaining > celebrationDaysFilter) return false;
    if (celebrationTypeFilter !== "ALL" && c.type !== celebrationTypeFilter) return false;
    return true;
  });

  // For overview tab - deduplicate logs by showing only the latest log per customer per day
  // (Since each channel creates a separate row, we group to avoid confusion)
  const deduplicatedOverviewLogs: CommunicationLog[] = [];
  const seenCustomerLogKeys = new Set<string>();
  for (const log of logs) {
    const dateKey = new Date(log.createdAt).toDateString();
    const key = `${log.customerId}-${log.triggerType}-${dateKey}`;
    if (!seenCustomerLogKeys.has(key)) {
      seenCustomerLogKeys.add(key);
      deduplicatedOverviewLogs.push(log);
    }
  }

  // Filtered Templates
  const filteredTemplates = templates.filter((t) => {
    if (templateFilter === "ALL") return true;
    if (templateFilter === "DUE") return t.category === "PREMIUM_DUE" || t.category === "POLICY_LAPSED";
    if (templateFilter === "CELEBRATION") return t.category === "BIRTHDAY" || t.category === "ANNIVERSARY";
    if (templateFilter === "MARKETING") return t.category === "MARKETING" || t.category === "CUSTOM";
    return true;
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      {/* Clean Brand Hero Header (Matching Customer & Policy 360 styling) */}
      <CustomerPageHero
        title="Marketing & Communications Hub"
        subtitle="Automated policy due alerts, birthday & anniversary wishes, and intelligent campaign broadcasts."
        icon={Megaphone}
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleRunScan}
              disabled={isScanning}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#1e3a8a] to-[#2563eb] px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-200 transition-all hover:brightness-110 disabled:opacity-50 cursor-pointer"
            >
              <Play size={14} className={isScanning ? "animate-spin" : ""} />
              {isScanning ? "Scanning System..." : "Run Daily Scan Now"}
            </button>
            <button
              onClick={loadAllData}
              disabled={isLoading}
              className="cursor-pointer rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 shadow-2xs"
              title="Refresh All Data"
            >
              <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
            </button>
          </div>
        }
      />

      {/* Metric Cards (Same clean CustomerStatCard styling) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <CustomerStatCard
          label="Total Audience"
          value={audienceCount?.totalMembers ?? 0}
          icon={Users}
          tone="accent"
        />
        <CustomerStatCard
          label="SMS Opted-In"
          value={audienceCount?.smsEligible ?? 0}
          icon={Smartphone}
          tone="success"
        />
        <CustomerStatCard
          label="Email Opted-In"
          value={audienceCount?.emailEligible ?? 0}
          icon={Mail}
          tone="neutral"
        />
        <CustomerStatCard
          label="Total Logs Dispatched"
          value={logsTotal}
          icon={History}
          tone="neutral"
        />
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 space-x-2 overflow-x-auto bg-white px-4 pt-2 rounded-2xl shadow-2xs">
        {[
          { key: "overview", label: "Overview & Celebrations", icon: Sparkles },
          { key: "campaigns", label: `Marketing Campaigns (${campaigns.length})`, icon: Megaphone },
          { key: "templates", label: `Message Templates (${templates.length})`, icon: FileText },
          { key: "settings", label: "Automation Rules", icon: Settings },
          { key: "logs", label: `Delivery Audit Logs (${logsTotal})`, icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as TabType)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? "border-[#1877F2] text-[#1877F2] bg-blue-50/50 rounded-t-xl"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
              }`}
            >
              <Icon size={16} className={isActive ? "text-[#1877F2]" : "text-slate-400"} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW & CELEBRATIONS */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Automated Scanner Status Card */}
          <div className="relative overflow-hidden rounded-2xl border border-blue-100 bg-[#f0f7ff] p-5 sm:p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-900">
                  {settings?.isAutoReminderEnabled ? "Daily Automation Engine: Active" : "Daily Automation Engine: Paused"}
                </span>
              </div>
              <h3 className="text-lg font-bold text-[#0f172a]">
                Automatic Premium Due, Birthday & Anniversary Alerts
              </h3>
              <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                Runs automatically every day at <strong>{settings?.cronScheduleTime || "09:00 AM"}</strong>. Automatically dispatches SMS & Email alerts for due dates at <strong>{settings?.dueDaysBefore || "30, 15, 7, 1, 0"}</strong> days before due date, plus Birthday & Wedding Anniversary greetings.
              </p>
              {settings?.lastRunAt && (
                <p className="text-[11px] font-medium text-slate-500 pt-1">
                  Last automated execution: {new Date(settings.lastRunAt).toLocaleString("en-IN")}
                </p>
              )}
            </div>

            <button
              onClick={handleRunScan}
              disabled={isScanning}
              className="shrink-0 px-4 py-2.5 bg-gradient-to-r from-[#1e3a8a] to-[#2563eb] hover:brightness-110 text-white text-xs font-semibold rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-2"
            >
              <Play size={14} className={isScanning ? "animate-spin" : ""} />
              {isScanning ? "Scanning..." : "Execute Scan Now"}
            </button>
          </div>

          {/* UPCOMING CELEBRATIONS PREVIEW WIDGET */}
          <CustomerSectionCard
            title="Upcoming Celebrations (Birthdays & Anniversaries)"
            subtitle="View customers with upcoming birthdays or wedding anniversaries, and send instant greetings"
            icon={Gift}
            actions={
              <div className="flex items-center gap-2">
                <select
                  value={celebrationTypeFilter}
                  onChange={(e: any) => setCelebrationTypeFilter(e.target.value)}
                  className="p-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 bg-white"
                >
                  <option value="ALL">All Events</option>
                  <option value="BIRTHDAY">Birthdays Only 🎂</option>
                  <option value="ANNIVERSARY">Anniversaries Only 💐</option>
                </select>
                <div className="flex bg-slate-100 p-0.5 rounded-lg">
                  <button
                    onClick={() => setCelebrationDaysFilter(7)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                      celebrationDaysFilter === 7 ? "bg-white text-[#1877F2] shadow-xs" : "text-slate-500"
                    }`}
                  >
                    Next 7 Days
                  </button>
                  <button
                    onClick={() => setCelebrationDaysFilter(30)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                      celebrationDaysFilter === 30 ? "bg-white text-[#1877F2] shadow-xs" : "text-slate-500"
                    }`}
                  >
                    Next 30 Days
                  </button>
                </div>
              </div>
            }
          >
            {filteredCelebrations.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No celebrations found within the next {celebrationDaysFilter} days.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredCelebrations.map((item) => {
                  const isBirthday = item.type === "BIRTHDAY";
                  return (
                    <div
                      key={item.id}
                      className="flex flex-col justify-between p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-200 hover:shadow-xs transition-all space-y-3"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                              isBirthday
                                ? "bg-amber-50 text-amber-800 border border-amber-200/50"
                                : "bg-emerald-50 text-emerald-800 border border-emerald-200/50"
                            }`}
                          >
                            {isBirthday ? <Gift size={12} /> : <Heart size={12} />}
                            {isBirthday ? "Birthday" : "Wedding Anniversary"}
                          </span>

                          {item.alreadySentToday ? (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300">
                              Sent Today ✅
                            </span>
                          ) : (
                            <span
                              className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                                item.isToday
                                  ? "bg-red-100 text-red-700 animate-pulse font-bold"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {item.isToday ? "Today! 🎉" : item.daysRemaining === 1 ? "Tomorrow" : `In ${item.daysRemaining} days`}
                            </span>
                          )}
                        </div>

                        <h4 className="font-bold text-sm text-slate-900 pt-1">{item.customerName}</h4>
                        <p className="text-xs text-slate-500 font-mono">
                          Date: {new Date(item.upcomingDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                        </p>
                        <div className="text-xs text-slate-500 flex flex-wrap gap-2">
                          {item.phone && <span>📱 {item.phone}</span>}
                          {item.email && <span className="truncate max-w-[150px]">📧 {item.email}</span>}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">
                          Channels: SMS & Email
                        </span>
                        {item.alreadySentToday ? (
                          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold rounded-lg">
                            Already Sent ✅
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSendDirectWish(item)}
                            disabled={isWishingCustomer === item.id}
                            className="px-3 py-1 bg-gradient-to-r from-[#1877F2] to-[#2563eb] text-white text-xs font-semibold rounded-lg hover:brightness-110 cursor-pointer disabled:opacity-50"
                          >
                            {isWishingCustomer === item.id ? "Sending..." : "Wish Now (SMS & Email)"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CustomerSectionCard>

          {/* Recent Communication Logs Preview */}
          <CustomerSectionCard
            title="Recent Communication Dispatch History"
            subtitle="Latest automated and manual customer touchpoints"
            icon={History}
            actions={
              <button
                onClick={() => setActiveTab("logs")}
                className="text-xs font-semibold text-[#1877F2] hover:underline cursor-pointer"
              >
                View Full Logs &rarr;
              </button>
            }
          >
            {deduplicatedOverviewLogs.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No communication logs recorded yet.</p>
            ) : (
              <CustomerTableFrame>
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50/70 border-b border-slate-100 uppercase tracking-wider text-slate-500 font-bold">
                    <tr>
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Channel</th>
                      <th className="py-3 px-4">Recipient</th>
                      <th className="py-3 px-4">Trigger</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {deduplicatedOverviewLogs.slice(0, 5).map((log) => (
                      <tr key={log.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="py-3 px-4 font-mono">{new Date(log.createdAt).toLocaleString("en-IN")}</td>
                        <td className="py-3 px-4 font-semibold text-slate-900">{log.customerName || "N/A"}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              log.channel === "SMS" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {log.channel}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono">{log.recipient}</td>
                        <td className="py-3 px-4 text-slate-500">{log.triggerType}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              log.status === "SENT"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : log.status === "SKIPPED"
                                ? "bg-slate-100 text-slate-600"
                                : "bg-red-50 text-red-700 border border-red-200"
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CustomerTableFrame>
            )}
          </CustomerSectionCard>
        </div>
      )}

      {/* TAB 2: CAMPAIGNS */}
      {activeTab === "campaigns" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <div>
              <h2 className="text-base font-bold text-slate-900">Marketing & Promotional Campaigns</h2>
              <p className="text-xs text-slate-500">
                Safe batch broadcasting (25 emails/SMS per chunk with delay) so system never crashes or gets blocked.
              </p>
            </div>
            <button
              onClick={() => setShowNewCampaignModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#1e3a8a] to-[#2563eb] hover:brightness-110 text-white text-xs font-semibold rounded-xl shadow-md shadow-blue-200 cursor-pointer"
            >
              <Plus size={16} /> Create New Campaign
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {campaigns.map((camp) => (
              <div
                key={camp.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-sm flex flex-col justify-between hover:border-blue-200 transition-all"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                        camp.status === "COMPLETED"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : camp.status === "RUNNING"
                          ? "bg-blue-50 text-blue-700 border border-blue-200 animate-pulse"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {camp.status}
                    </span>
                    <span className="text-xs font-mono text-slate-500">Channel: {camp.channel}</span>
                  </div>
                  <h3 className="font-bold text-sm text-slate-900">{camp.title}</h3>
                  <p className="text-xs text-slate-500 line-clamp-3">
                    {camp.customMessage || camp.template?.smsBody || "No message preview available"}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-3">
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>Recipients: {camp.totalRecipients || 0}</span>
                    <span className="text-emerald-600 font-semibold">Delivered: {camp.successfulCount || 0}</span>
                  </div>

                  {camp.status !== "COMPLETED" && (
                    <button
                      onClick={() => handleSendCampaign(camp.id, camp.title)}
                      disabled={isBroadcasting === camp.id}
                      className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <Send size={14} className={isBroadcasting === camp.id ? "animate-spin" : ""} />
                      {isBroadcasting === camp.id ? "Broadcasting (Batches of 25)..." : "Safe Broadcast Now"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* New Campaign Modal */}
          {showNewCampaignModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 border border-slate-200">
                <h3 className="text-base font-bold text-slate-900">Create Marketing Campaign</h3>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Campaign Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Festive Tax-Saving Plan Alert"
                      value={newCampaignTitle}
                      onChange={(e) => setNewCampaignTitle(e.target.value)}
                      className="w-full p-2.5 border rounded-xl text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Channel</label>
                    <select
                      value={newCampaignChannel}
                      onChange={(e: any) => setNewCampaignChannel(e.target.value)}
                      className="w-full p-2.5 border rounded-xl text-xs"
                    >
                      <option value="ALL">Both SMS & Email</option>
                      <option value="SMS">SMS Only</option>
                      <option value="EMAIL">Email Only</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Use Template</label>
                    <select
                      value={newCampaignTemplateId}
                      onChange={(e) => setNewCampaignTemplateId(e.target.value)}
                      className="w-full p-2.5 border rounded-xl text-xs"
                    >
                      <option value="">-- Custom Message (No Template) --</option>
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Custom Message / Override</label>
                    <textarea
                      rows={3}
                      placeholder="Enter SMS or Email copy text..."
                      value={newCampaignCustomMessage}
                      onChange={(e) => setNewCampaignCustomMessage(e.target.value)}
                      className="w-full p-2.5 border rounded-xl text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3">
                  <button
                    onClick={() => setShowNewCampaignModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateCampaign}
                    className="px-5 py-2.5 bg-[#1877F2] text-white rounded-xl text-xs font-semibold hover:brightness-110 cursor-pointer"
                  >
                    Save Campaign
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: TEMPLATES */}
      {activeTab === "templates" && (
        <div className="space-y-4">
          {/* Template Filters */}
          <div className="flex gap-2 border-b border-slate-200 pb-3">
            {[
              { key: "ALL", label: "All Templates" },
              { key: "DUE", label: "⏰ Due Date & Lapse Alerts" },
              { key: "CELEBRATION", label: "🎂 Greetings & Celebrations" },
              { key: "MARKETING", label: "📢 Marketing & Broadcasts" },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setTemplateFilter(f.key)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  templateFilter === f.key
                    ? "bg-slate-900 text-white shadow-2xs"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Templates List */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 px-1 mb-2">Available Templates</h3>
              {filteredTemplates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTemplate(t)}
                  className={`w-full text-left p-3 rounded-xl transition-all cursor-pointer ${
                    selectedTemplate?.id === t.id
                      ? "bg-blue-50 border border-blue-200 text-blue-900"
                      : "hover:bg-slate-50 border border-transparent text-slate-700"
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-xs">{t.name}</span>
                    <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                      {t.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono">{t.code}</p>
                </button>
              ))}
            </div>

            {/* Template Editor */}
            {selectedTemplate && (
              <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-2xs">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-base text-slate-900">{selectedTemplate.name}</h3>
                    <p className="text-xs text-slate-400 font-mono">Code: {selectedTemplate.code}</p>
                  </div>
                  <button
                    onClick={handleSaveTemplate}
                    className="px-5 py-2.5 bg-gradient-to-r from-[#1e3a8a] to-[#2563eb] hover:brightness-110 text-white text-xs font-semibold rounded-xl shadow-sm cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>

                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Email Subject</label>
                    <input
                      type="text"
                      value={selectedTemplate.subject || ""}
                      onChange={(e) => setSelectedTemplate({ ...selectedTemplate, subject: e.target.value })}
                      className="w-full p-2.5 border rounded-xl text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">SMS Message Body</label>
                    <textarea
                      rows={4}
                      value={selectedTemplate.smsBody || ""}
                      onChange={(e) => setSelectedTemplate({ ...selectedTemplate, smsBody: e.target.value })}
                      className="w-full p-2.5 border rounded-xl text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Supported Dynamic Placeholders</label>
                    <div className="p-3 bg-slate-50 border rounded-xl text-slate-600 font-mono text-xs flex flex-wrap gap-2">
                      {selectedTemplate.variables?.split(",").map((v) => (
                        <span key={v} className="bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
                          {`{${v.trim()}}`}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: AUTOMATION RULES */}
      {activeTab === "settings" && settings && (
        <div className="max-w-2xl bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-2xs">
          <div>
            <h3 className="text-base font-bold text-slate-900">Automated Notification Rules</h3>
            <p className="text-xs text-slate-500">
              Configure how the background cron scanner automatically triggers premium reminders and customer greetings without any manual effort.
            </p>
          </div>

          <div className="space-y-5 text-xs">
            {/* Auto Reminders Toggle */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <p className="font-bold text-slate-900">Automatic Premium Due Reminders</p>
                <p className="text-slate-500">Runs automated scan daily at {settings.cronScheduleTime || "09:00 AM"}</p>
              </div>
              <input
                type="checkbox"
                checked={settings.isAutoReminderEnabled}
                onChange={(e) => setSettings({ ...settings, isAutoReminderEnabled: e.target.checked })}
                className="w-5 h-5 rounded text-[#1877F2] cursor-pointer"
              />
            </div>

            {/* Reminder Days */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Trigger Days Before Due Date (Comma-separated)
              </label>
              <input
                type="text"
                value={settings.dueDaysBefore}
                onChange={(e) => setSettings({ ...settings, dueDaysBefore: e.target.value })}
                className="w-full p-2.5 border rounded-xl text-xs font-mono"
                placeholder="30,15,7,1,0"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                E.g. <code>30,15,7,1,0</code> sends alerts at 30 days, 15 days, 7 days, 1 day before, and on due date.
              </p>
            </div>

            {/* Birthday & Anniversary Toggles */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <p className="font-bold text-slate-900">Automatic Birthday & Anniversary Greetings</p>
                <p className="text-slate-500">Dispatches wishes automatically on the customer's birthday and wedding anniversary</p>
              </div>
              <input
                type="checkbox"
                checked={settings.isBirthdayWishesEnabled}
                onChange={(e) => setSettings({ ...settings, isBirthdayWishesEnabled: e.target.checked })}
                className="w-5 h-5 rounded text-[#1877F2] cursor-pointer"
              />
            </div>

            {/* Channels Allowed */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 border rounded-xl">
                <input
                  type="checkbox"
                  checked={settings.sendSms}
                  onChange={(e) => setSettings({ ...settings, sendSms: e.target.checked })}
                  className="w-4 h-4 text-[#1877F2] cursor-pointer"
                />
                <span className="font-semibold text-slate-700">Allow SMS Dispatch</span>
              </div>
              <div className="flex items-center gap-3 p-3 border rounded-xl">
                <input
                  type="checkbox"
                  checked={settings.sendEmail}
                  onChange={(e) => setSettings({ ...settings, sendEmail: e.target.checked })}
                  className="w-4 h-4 text-[#1877F2] cursor-pointer"
                />
                <span className="font-semibold text-slate-700">Allow Email Dispatch</span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={handleSaveSettings}
                disabled={isSavingSettings}
                className="px-6 py-2.5 bg-gradient-to-r from-[#1e3a8a] to-[#2563eb] text-white font-semibold rounded-xl text-xs shadow-md cursor-pointer disabled:opacity-50"
              >
                {isSavingSettings ? "Saving..." : "Save Preferences"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: AUDIT LOGS (With Pagination, Channel & Status Filters) */}
      {activeTab === "logs" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-2xs">
          <div className="flex flex-col md:flex-row gap-3 justify-between items-start md:items-center">
            <div>
              <h3 className="font-bold text-base text-slate-900">Communication & Delivery Audit Logs</h3>
              <p className="text-xs text-slate-500">Every automated alert and marketing broadcast is tracked here.</p>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <input
                type="text"
                placeholder="Search by customer, phone, policy..."
                value={logsSearch}
                onChange={(e) => setLogsSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchFilteredLogs(1)}
                className="p-2 border rounded-xl text-xs w-full sm:w-56"
              />

              <select
                value={logsChannel}
                onChange={(e) => setLogsChannel(e.target.value)}
                className="p-2 border rounded-xl text-xs font-medium text-slate-700 bg-white"
              >
                <option value="">All Channels</option>
                <option value="SMS">SMS</option>
                <option value="EMAIL">Email</option>
              </select>

              <select
                value={logsStatus}
                onChange={(e) => setLogsStatus(e.target.value)}
                className="p-2 border rounded-xl text-xs font-medium text-slate-700 bg-white"
              >
                <option value="">All Statuses</option>
                <option value="SENT">SENT</option>
                <option value="SKIPPED">SKIPPED</option>
                <option value="FAILED">FAILED</option>
              </select>

              <button
                onClick={() => fetchFilteredLogs(1)}
                className="px-3 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Filter
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <CustomerTableFrame
              footer={
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>
                    Showing Page <strong className="text-slate-800">{logsPage}</strong> of{" "}
                    <strong className="text-slate-800">{logsTotalPages || 1}</strong> (Total: {logsTotal} records)
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => fetchFilteredLogs(logsPage - 1)}
                      disabled={logsPage <= 1 || isLogsLoading}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-40 cursor-pointer"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      onClick={() => fetchFilteredLogs(logsPage + 1)}
                      disabled={logsPage >= logsTotalPages || isLogsLoading}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-40 cursor-pointer"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              }
            >
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50/70 text-slate-500 uppercase font-bold border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Policy No.</th>
                    <th className="py-3 px-4">Channel</th>
                    <th className="py-3 px-4">Recipient</th>
                    <th className="py-3 px-4">Trigger</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="py-3 px-4 font-mono">{new Date(log.createdAt).toLocaleString("en-IN")}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{log.customerName || "N/A"}</td>
                      <td className="py-3 px-4 font-mono text-[#1877F2]">{log.policyNumber || "--"}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                            log.channel === "SMS" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {log.channel}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono">{log.recipient}</td>
                      <td className="py-3 px-4 text-slate-500">{log.triggerType}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            log.status === "SENT"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : log.status === "SKIPPED"
                              ? "bg-slate-100 text-slate-600"
                              : "bg-red-50 text-red-700 border border-red-200"
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CustomerTableFrame>
          </div>
        </div>
      )}
    </div>
  );
}
