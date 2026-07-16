import express from 'express';
import { getClaims,getClaimById, addClaim, updateClaim, deleteClaim } from '../controllers/claimController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.route('/')
    .get(protect, getClaims)
    .post(protect, addClaim);

router.route('/:id')
    .get(getClaimById)
    .put(protect, updateClaim)
    .delete(protect, deleteClaim);

export default router;