import { Request, Response } from "express";
import {
  createCampaign,
  executeCampaign,
  getCampaigns,
  getAudienceCount,
} from "../services/marketingService.js";

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

export const fetchAudienceEstimation = async (req: Request, res: Response): Promise<void> => {
  try {
    const audience = await getAudienceCount(req.query);
    res.status(200).json({ success: true, data: audience });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
