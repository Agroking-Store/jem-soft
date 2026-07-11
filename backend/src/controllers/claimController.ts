import { Request, Response } from 'express';
import * as claimService from '../services/claimService.js';

export const getClaims = async (req: Request, res: Response) => {
    try {
        const claims = await claimService.getAllClaims();
        res.status(200).json({ success: true, data: claims });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const addClaim = async (req: Request, res: Response) => {
    try {
        const newClaim = await claimService.createClaim(req.body, req.user!.id);
        res.status(201).json({ success: true, data: newClaim });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updateClaim = async (req: Request, res: Response) => {
    try {
        const updatedClaim = await claimService.updateClaimById(req.params.id, req.body, req.user!.id);
        res.status(200).json({ success: true, data: updatedClaim });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteClaim = async (req: Request, res: Response) => {
    try {
        await claimService.deleteClaimById(req.params.id);
        res.status(200).json({ success: true, message: 'Claim deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};