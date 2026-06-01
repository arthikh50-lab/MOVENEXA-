import { Router } from 'express';
import { getSubscription, updateSubscription } from '../controllers/subscription.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', requireAuth, getSubscription);
router.post('/upgrade', requireAuth, updateSubscription);

export default router;
