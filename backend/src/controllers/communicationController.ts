import { Request, Response } from "express";
import prisma from "../config/database.js";
import {
  sendPolicyDueReminder,
  sendDirectMessage,
  getCommunicationLogs,
  getReminderSettings,
  updateReminderSettings,
} from "../services/communicationService.js";
import { runSchedulerScan } from "../services/schedulerService.js";
import { seedDefaultTemplates } from "../services/templateService.js";

export const triggerPolicyReminder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { policyId, templateCode, customMessage, customSubject, channel } = req.body;
    if (!policyId) {
      res.status(400).json({ success: false, message: "Policy ID is required." });
      return;
    }

    const result = await sendPolicyDueReminder({
      policyId,
      templateCode,
      customMessage,
      customSubject,
      channel: channel || "ALL",
      triggerType: "MANUAL_REMINDER",
    });

    res.status(200).json({
      success: true,
      message: "Reminder dispatched successfully.",
      data: result,
    });
  } catch (error: any) {
    console.error("Trigger Reminder Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to send reminder.",
    });
  }
};

export const triggerDirectMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerId, channel, subject, message, policyId } = req.body;
    if (!customerId || !message) {
      res.status(400).json({ success: false, message: "Customer ID and message are required." });
      return;
    }

    const result = await sendDirectMessage({
      customerId,
      channel: channel || "ALL",
      subject,
      message,
      policyId,
    });

    res.status(200).json({
      success: true,
      message: "Direct message dispatched.",
      data: result,
    });
  } catch (error: any) {
    console.error("Direct Message Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to send direct message.",
    });
  }
};

export const fetchCommunicationLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerId, policyId, channel, status, search, page, limit } = req.query;

    const data = await getCommunicationLogs({
      customerId: customerId as string,
      policyId: policyId as string,
      channel: channel as any,
      status: status as any,
      search: search as string,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 20,
    });

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error("Fetch Logs Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch logs.",
    });
  }
};

export const fetchReminderSettings = async (_req: Request, res: Response): Promise<void> => {
  try {
    const settings = await getReminderSettings();
    res.status(200).json({ success: true, data: settings });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const editReminderSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const updated = await updateReminderSettings(req.body);
    res.status(200).json({
      success: true,
      message: "Reminder settings updated successfully.",
      data: updated,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const fetchTemplates = async (_req: Request, res: Response): Promise<void> => {
  try {
    let templates = await prisma.notificationTemplate.findMany({
      orderBy: { createdAt: "asc" },
    });

    if (templates.length === 0) {
      await seedDefaultTemplates();
      templates = await prisma.notificationTemplate.findMany({
        orderBy: { createdAt: "asc" },
      });
    }

    res.status(200).json({ success: true, data: templates });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const editTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, subject, smsBody, emailBody, isActive } = req.body;

    const updated = await prisma.notificationTemplate.update({
      where: { id },
      data: { name, subject, smsBody, emailBody, isActive },
    });

    res.status(200).json({
      success: true,
      message: "Template updated successfully.",
      data: updated,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const runManualSchedulerScan = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await runSchedulerScan();
    res.status(200).json({
      success: true,
      message: "Scheduler scan executed successfully.",
      data: result,
    });
  } catch (error: any) {
    console.error("Manual Scheduler Scan Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Scheduler scan failed.",
    });
  }
};
