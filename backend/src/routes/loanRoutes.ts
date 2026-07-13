import express from 'express';
import { getLoans, getLoan, addLoan, updateLoan, deleteLoan } from '../controllers/loanController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.route('/')
    .get(protect, getLoans)
    .post(protect, addLoan);

router.route('/:id')
    .get(protect, getLoan)
    .put(protect, updateLoan)
    .delete(protect, deleteLoan);

export default router;