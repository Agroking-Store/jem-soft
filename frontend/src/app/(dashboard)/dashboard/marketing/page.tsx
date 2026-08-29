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
} from "@/features/marketing/services/marketingApi";
import {
  CommunicationLog,
  NotificationTemplate,
  ReminderSetting,
  MarketingCampaign,
} from "@/features/marketing/types";

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

  // Campaigns State
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [audienceCount, setAudienceCount] = useState<{ totalMembers: number; smsEligible: number; emailEligible: number } | null>(null);
  const [showNewCampaignModal, setShowNewCampaignModal] = useState<boolean>(false);
  const [newCampaignTitle, setNewCampaignTitle] = useState<string>("");
  const [newCampaignChannel, setNewCampaignChannel] = useState<"ALL" | "SMS" | "EMAIL">("ALL");
  const [newCampaignTemplateId, setNewCampaignTemplateId] = useState<string>("");
  const [newCampaignCustomMessage, setNewCampaignCustomMessage] = useState<string>("");

  // Logs State
  const [logs, setLogs] = useState<CommunicationLog[]>([]);
  const [logsTotal, setLogsTotal] = useState<number>(0);
  const [logsPage, setLogsPage] = useState<number>(1);
  const [logsSearch, setLogsSearch] = useState<string>("");
  const [logsChannel, setLogsChannel] = useState<string>("");
  const [logsStatus, setLogsStatus] = useState<string>("");

  // Scan status
  const [isScanning, setIsScanning] = useState<boolean>(false);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [settingsRes, templatesRes, campaignsRes, audienceRes, logsRes] = await Promise.all([
        getReminderSettingsApi().catch(() => ({ success: false, data: null })),
        getTemplatesApi().catch(() => ({ success: false, data: [] })),
        getCampaignsApi().catch(() => ({ success: false, data: [] })),
        getAudienceEstimationApi().catch(() => ({ success: false, data: null })),
        getCommunicationLogsApi({ page: 1, limit: 15 }).catch(() => ({ success: false, data: { logs: [], total: 0, page: 1, totalPages: 1 } })),
      ]);

      if (settingsRes.data) setSettings(settingsRes.data);
      if (templatesRes.data) {
        setTemplates(templatesRes.data);
        if (templatesRes.data.length > 0) setSelectedTemplate(templatesRes.data[0]);
      }
      if (campaignsRes.data) setCampaigns(campaignsRes.data);
      if (audienceRes.data) setAudienceCount(audienceRes.data);
      if (logsRes.data) {
        setLogs(logsRes.data.logs);
        setLogsTotal(logsRes.data.total);
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
        toast.success(`Scan completed! Policies checked: ${res.data.totalPoliciesScanned}, Reminders sent: ${res.data.remindersDispatched}`);
        loadAllData();
      }
    } catch (err: any) {
      toast.error("Manual scheduler scan failed.");
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
        toast.success("Reminder & Marketing preferences saved successfully!");
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

  const handleSendCampaign = async (id: string) => {
    const confirmed = window.confirm("Are you sure you want to broadcast this campaign to all opted-in customers?");
    if (!confirmed) return;

    try {
      toast.loading("Broadcasting campaign...", { id: "camp-broadcast" });
      const res = await sendCampaignApi(id);
      toast.dismiss("camp-broadcast");
      if (res.success) {
        toast.success("Campaign broadcast completed!");
        const campRes = await getCampaignsApi();
        if (campRes.data) setCampaigns(campRes.data);
        loadAllData();
      }
    } catch (err: any) {
      toast.dismiss("camp-broadcast");
      toast.error("Failed to broadcast campaign.");
    }
  };

  const fetchFilteredLogs = async (page = 1) => {
    try {
      const res = await getCommunicationLogsApi({
        page,
        limit: 15,
        search: logsSearch || undefined,
        channel: logsChannel || undefined,
        status: logsStatus || undefined,
      });
      if (res.data) {
        setLogs(res.data.logs);
        setLogsTotal(res.data.total);
        setLogsPage(res.data.page);
      }
    } catch (err) {}
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Brand Hero Header */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
        <div className="bg-gradient-to-r from-[#0B1220] via-[#132342] to-[#16294D] px-6 py-6 sm:px-8 sm:py-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#B8873A]/20 border border-[#B8873A]/30 text-[#E8C77A] shadow-inner">
                <Megaphone size={24} />
              </div>
              <div>
                <h1 className="font-serif text-2xl font-semibold tracking-tight text-[#E8C77A] sm:text-3xl">
                  Marketing & Communications Hub
                </h1>
                <p className="mt-1 text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
                  Automated upcoming premium due reminders, WhatsApp/SMS/Email campaigns, and customer service preferences.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleRunScan}
                disabled={isScanning}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#B8873A] hover:bg-[#a0742f] text-white text-xs font-bold uppercase tracking-wider shadow-md shadow-[#B8873A]/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                <Play size={14} className={isScanning ? "animate-spin" : ""} />
                {isScanning ? "Scanning Policies..." : "Run Due Date Scan Now"}
              </button>
              <button
                onClick={loadAllData}
                className="p-2.5 text-[#E8C77A] hover:text-white bg-white/10 hover:bg-white/20 rounded-xl transition-colors cursor-pointer border border-white/10"
                title="Refresh"
              >
                <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 space-x-2 overflow-x-auto bg-white px-4 pt-2 rounded-xl shadow-2xs">
        {[
          { key: "overview", label: "Overview & Health", icon: Sparkles },
          { key: "campaigns", label: `Marketing Campaigns (${campaigns.length})`, icon: Megaphone },
          { key: "templates", label: `Message Templates (${templates.length})`, icon: FileText },
          { key: "settings", label: "Automation Rules", icon: Settings },
          { key: "logs", label: `Delivery Logs (${logsTotal})`, icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as TabType)}
              className={`flex items-center gap-2 px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? "border-[#B8873A] text-[#0B1220] bg-slate-50/80 rounded-t-xl"
                  : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300"
              }`}
            >
              <Icon size={16} className={isActive ? "text-[#B8873A]" : ""} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-blue-500 to-indigo-500" />
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Audience Size</span>
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600"><Users size={18} /></div>
              </div>
              <p className="font-serif text-2xl font-bold text-slate-900">{audienceCount?.totalMembers ?? "--"}</p>
              <p className="text-xs text-slate-400 mt-1">Customer master records in database</p>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-500 to-teal-500" />
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">SMS Opt-In</span>
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600"><Smartphone size={18} /></div>
              </div>
              <p className="font-serif text-2xl font-bold text-emerald-600">{audienceCount?.smsEligible ?? "--"}</p>
              <p className="text-xs text-slate-400 mt-1">Customers allowing SMS Marketing</p>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#B8873A] to-[#E8C77A]" />
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Email Opt-In</span>
                <div className="p-2 rounded-xl bg-amber-50 text-[#B8873A]"><Mail size={18} /></div>
              </div>
              <p className="font-serif text-2xl font-bold text-[#B8873A]">{audienceCount?.emailEligible ?? "--"}</p>
              <p className="text-xs text-slate-400 mt-1">Customers allowing Email Marketing</p>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-slate-700 to-slate-900" />
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Dispatched History</span>
                <div className="p-2 rounded-xl bg-slate-100 text-slate-800"><History size={18} /></div>
              </div>
              <p className="font-serif text-2xl font-bold text-slate-900">{logsTotal}</p>
              <p className="text-xs text-slate-400 mt-1">Logged notifications & messages</p>
            </div>
          </div>

          {/* Automated Scanner Status Card */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-r from-[#0B1220] via-[#132342] to-[#16294D] text-white p-6 sm:p-7 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-[11px] uppercase tracking-widest text-[#E8C77A] font-bold">
                  {settings?.isAutoReminderEnabled ? "Automated Engine: Active" : "Automated Engine: Paused"}
                </span>
              </div>
              <h3 className="font-serif text-xl font-semibold text-white">Daily Insurance Due-Date & Birthday Scanner</h3>
              <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                Scans all policies daily at {settings?.cronScheduleTime || "09:00 AM"}. Automatically triggers SMS & Email reminders {settings?.dueDaysBefore || "30, 15, 7, 1, 0"} days before due date to opted-in customers.
              </p>
              {settings?.lastRunAt && (
                <p className="text-[11px] text-slate-400 font-mono">
                  Last executed on: {new Date(settings.lastRunAt).toLocaleString("en-IN")}
                </p>
              )}
            </div>

            <button
              onClick={handleRunScan}
              disabled={isScanning}
              className="shrink-0 px-5 py-2.5 bg-[#B8873A] hover:bg-[#a0742f] text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
            >
              <Play size={14} /> Run Scan Now
            </button>
          </div>

          {/* Recent Communication Logs Preview */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#B8873A]/40 to-transparent" />
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Recent Communication History</h3>
              <button
                onClick={() => setActiveTab("logs")}
                className="text-sm font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
              >
                View All Logs &rarr;
              </button>
            </div>

            {logs.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">No communication logs recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
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
                    {logs.slice(0, 5).map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 text-xs font-mono">
                          {new Date(log.createdAt).toLocaleString("en-IN")}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900">{log.customerName || "N/A"}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md ${
                              log.channel === "SMS" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {log.channel}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs font-mono">{log.recipient}</td>
                        <td className="py-3 px-4 text-xs text-slate-500">{log.triggerType}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                              log.status === "SENT"
                                ? "bg-emerald-50 text-emerald-700"
                                : log.status === "SKIPPED"
                                ? "bg-slate-100 text-slate-600"
                                : "bg-red-50 text-red-700"
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CAMPAIGNS */}
      {activeTab === "campaigns" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white p-5 rounded-2xl border border-slate-200">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Marketing & Promotional Campaigns</h2>
              <p className="text-xs text-slate-500">
                Broadcast festival wishes, insurance offers, and tax saving advice to opted-in customers.
              </p>
            </div>
            <button
              onClick={() => setShowNewCampaignModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-md shadow-blue-500/20 cursor-pointer"
            >
              <Plus size={16} /> Create Campaign
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {campaigns.map((camp) => (
              <div key={camp.id} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-sm flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                        camp.status === "COMPLETED"
                          ? "bg-emerald-50 text-emerald-700"
                          : camp.status === "RUNNING"
                          ? "bg-blue-50 text-blue-700"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {camp.status}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      Channel: {camp.channel}
                    </span>
                  </div>
                  <h3 className="font-bold text-base text-slate-900">{camp.title}</h3>
                  <p className="text-xs text-slate-500 line-clamp-3">
                    {camp.customMessage || camp.template?.smsBody || "No message preview available"}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Recipients: {camp.totalRecipients || 0}</span>
                    <span className="text-emerald-600 font-medium">Delivered: {camp.successfulCount || 0}</span>
                  </div>

                  {camp.status !== "COMPLETED" && (
                    <button
                      onClick={() => handleSendCampaign(camp.id)}
                      className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Send size={14} /> Broadcast Now
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* New Campaign Modal */}
          {showNewCampaignModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-slate-200">
                <h3 className="text-lg font-bold text-slate-900">Create Marketing Campaign</h3>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Campaign Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Festive Life Cover Offer"
                      value={newCampaignTitle}
                      onChange={(e) => setNewCampaignTitle(e.target.value)}
                      className="w-full p-2.5 border rounded-xl text-sm"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Channel</label>
                    <select
                      value={newCampaignChannel}
                      onChange={(e: any) => setNewCampaignChannel(e.target.value)}
                      className="w-full p-2.5 border rounded-xl text-sm"
                    >
                      <option value="ALL">SMS & Email (Both)</option>
                      <option value="SMS">SMS Only</option>
                      <option value="EMAIL">Email Only</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Template</label>
                    <select
                      value={newCampaignTemplateId}
                      onChange={(e) => setNewCampaignTemplateId(e.target.value)}
                      className="w-full p-2.5 border rounded-xl text-sm"
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
                      placeholder="Enter custom SMS/Email text..."
                      value={newCampaignCustomMessage}
                      onChange={(e) => setNewCampaignCustomMessage(e.target.value)}
                      className="w-full p-2.5 border rounded-xl text-sm"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3">
                  <button
                    onClick={() => setShowNewCampaignModal(false)}
                    className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateCampaign}
                    className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 cursor-pointer"
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Templates List */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
            <h3 className="font-bold text-sm text-slate-800 px-2 mb-3">Available Templates</h3>
            {templates.map((t) => (
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
                  <span className="font-semibold text-sm">{t.name}</span>
                  <span className="text-[10px] font-mono bg-slate-200 px-1.5 py-0.5 rounded text-slate-700">
                    {t.category}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono">{t.code}</p>
              </button>
            ))}
          </div>

          {/* Template Editor */}
          {selectedTemplate && (
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-sm">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-lg text-slate-900">{selectedTemplate.name}</h3>
                  <p className="text-xs text-slate-400 font-mono">Code: {selectedTemplate.code}</p>
                </div>
                <button
                  onClick={handleSaveTemplate}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm cursor-pointer"
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
                    className="w-full p-2.5 border rounded-xl text-sm"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">SMS Message Body</label>
                  <textarea
                    rows={4}
                    value={selectedTemplate.smsBody || ""}
                    onChange={(e) => setSelectedTemplate({ ...selectedTemplate, smsBody: e.target.value })}
                    className="w-full p-2.5 border rounded-xl text-sm font-mono"
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
      )}

      {/* TAB 4: AUTOMATION SETTINGS */}
      {activeTab === "settings" && settings && (
        <div className="max-w-2xl bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-sm">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Automated Notification Rules</h3>
            <p className="text-xs text-slate-500">
              Configure how and when the system triggers upcoming premium reminders and CRM greetings.
            </p>
          </div>

          <div className="space-y-5 text-sm">
            {/* Auto Reminders Toggle */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <p className="font-semibold text-slate-800">Enable Automated Daily Due-Date Reminders</p>
                <p className="text-xs text-slate-500">Runs daily background scan on upcoming policy premiums</p>
              </div>
              <input
                type="checkbox"
                checked={settings.isAutoReminderEnabled}
                onChange={(e) => setSettings({ ...settings, isAutoReminderEnabled: e.target.checked })}
                className="w-5 h-5 rounded text-blue-600 cursor-pointer"
              />
            </div>

            {/* Reminder Days */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Days Before Due Date to Send Reminders (Comma-separated)
              </label>
              <input
                type="text"
                value={settings.dueDaysBefore}
                onChange={(e) => setSettings({ ...settings, dueDaysBefore: e.target.value })}
                className="w-full p-2.5 border rounded-xl text-sm font-mono"
                placeholder="30,15,7,1,0"
              />
              <p className="text-xs text-slate-400 mt-1">
                Example: <code>30,15,7,1,0</code> will send reminders at 30 days, 15 days, 7 days, 1 day, and on due date.
              </p>
            </div>

            {/* Birthday Wishes Toggle */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <p className="font-semibold text-slate-800">Automatic Customer Birthday Greetings</p>
                <p className="text-xs text-slate-500">Sends greeting SMS & Email on customer birthday</p>
              </div>
              <input
                type="checkbox"
                checked={settings.isBirthdayWishesEnabled}
                onChange={(e) => setSettings({ ...settings, isBirthdayWishesEnabled: e.target.checked })}
                className="w-5 h-5 rounded text-blue-600 cursor-pointer"
              />
            </div>

            {/* Channels Enabled */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 border rounded-xl">
                <input
                  type="checkbox"
                  checked={settings.sendSms}
                  onChange={(e) => setSettings({ ...settings, sendSms: e.target.checked })}
                  className="w-4 h-4 text-blue-600 cursor-pointer"
                />
                <span className="font-medium text-slate-700 text-xs">Allow SMS Dispatch</span>
              </div>
              <div className="flex items-center gap-3 p-3 border rounded-xl">
                <input
                  type="checkbox"
                  checked={settings.sendEmail}
                  onChange={(e) => setSettings({ ...settings, sendEmail: e.target.checked })}
                  className="w-4 h-4 text-blue-600 cursor-pointer"
                />
                <span className="font-medium text-slate-700 text-xs">Allow Email Dispatch</span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={handleSaveSettings}
                disabled={isSavingSettings}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm shadow-md cursor-pointer disabled:opacity-50"
              >
                {isSavingSettings ? "Saving..." : "Save Preferences"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: LOGS */}
      {activeTab === "logs" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
            <h3 className="font-bold text-base text-slate-900">Communication & Delivery Logs</h3>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                placeholder="Search by customer, policy, phone..."
                value={logsSearch}
                onChange={(e) => setLogsSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchFilteredLogs(1)}
                className="p-2 border rounded-xl text-xs w-full sm:w-64"
              />
              <button
                onClick={() => fetchFilteredLogs(1)}
                className="px-3 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Filter
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
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
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 text-xs font-mono">
                      {new Date(log.createdAt).toLocaleString("en-IN")}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900">{log.customerName || "N/A"}</td>
                    <td className="py-3 px-4 font-mono text-xs text-blue-600">{log.policyNumber || "--"}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                          log.channel === "SMS" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {log.channel}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs font-mono">{log.recipient}</td>
                    <td className="py-3 px-4 text-xs text-slate-500">{log.triggerType}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                          log.status === "SENT"
                            ? "bg-emerald-50 text-emerald-700"
                            : log.status === "SKIPPED"
                            ? "bg-slate-100 text-slate-600"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
