import express from 'express';
import { getLoanStatuses } from '../controllers/loanStatusMasterController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.route('/').get(protect, getLoanStatuses);

export default router;