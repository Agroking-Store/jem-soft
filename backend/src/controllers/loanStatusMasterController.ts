import { Request, Response } from 'express';
import * as loanStatusMasterService from '../services/loanStatusMasterService.js';

export const getLoanStatuses = async (req: Request, res: Response) => {
    try {
        const statuses = await loanStatusMasterService.getAllLoanStatuses();
        res.status(200).json({ success: true, data: statuses });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};