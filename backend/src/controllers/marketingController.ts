import { Request, Response } from "express";
import {
  createCampaign,
  executeCampaign,
  getCampaigns,
  getAudienceCount,
  sendCampaignTestEmail,
} from "../services/marketingService.js";
import validator from "validator";

export const fetchCampaigns = async (_req: Request, res: Response): Promise<void> => {
  try {
    const campaigns = await getCampaigns();
    res.status(200).json({ success: true, data: campaigns });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createNewCampaign = async (req: Request, res: Response): Promise<void> => {
  try {
    const campaign = await createCampaign(req.body);
    res.status(201).json({
      success: true,
      message: "Marketing campaign created.",
      data: campaign,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const triggerCampaignSend = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await executeCampaign(id);
    res.status(200).json({
      success: true,
      message: "Campaign dispatched to eligible customers.",
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const triggerCampaignTestEmail = async (req: Request, res: Response): Promise<void> => {
  const {
    to,
    campaignId,
    title,
    templateId,
    customSubject,
    customMessage,
  } = req.body ?? {};

  if (typeof to !== "string" || !validator.isEmail(to.trim())) {
    res.status(400).json({ success: false, message: "Enter a valid email address." });
    return;
  }
  if (campaignId !== undefined && typeof campaignId !== "string") {
    res.status(400).json({ success: false, message: "Invalid campaign ID." });
    return;
  }
  if (!campaignId && (typeof title !== "string" || !title.trim())) {
    res.status(400).json({ success: false, message: "Campaign title is required." });
    return;
  }
  if (templateId !== undefined && typeof templateId !== "string") {
    res.status(400).json({ success: false, message: "Invalid campaign template ID." });
    return;
  }
  if (customSubject !== undefined && typeof customSubject !== "string") {
    res.status(400).json({ success: false, message: "Invalid custom email subject." });
    return;
  }
  if (customMessage !== undefined && typeof customMessage !== "string") {
    res.status(400).json({ success: false, message: "Invalid custom campaign message." });
    return;
  }

  try {
    const result = await sendCampaignTestEmail({
      to: to.trim(),
      campaignId,
      title,
      templateId,
      customSubject,
      customMessage,
    });

    if (result.status !== "SENT") {
      res.status(502).json({
        success: false,
        message: result.errorMessage || "Failed to send test email.",
      });
      return;
    }

    res.status(200).json({ success: true, message: "Test email sent successfully." });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to send test email.";
    const status = message.includes("not found") ? 404 : 500;
    res.status(status).json({ success: false, message });
  }
};

export const fetchAudienceEstimation = async (req: Request, res: Response): Promise<void> => {
  try {
    const audience = await getAudienceCount(req.query);
    res.status(200).json({ success: true, data: audience });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
