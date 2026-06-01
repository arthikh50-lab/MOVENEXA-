import { Router } from 'express';
import { createOrder } from '../controllers/order.controller.js';
import { requireAuth, requireActiveSubscription } from '../middleware/auth.middleware.js';

const router = Router();

router.use(requireAuth);
router.use(requireActiveSubscription);

// Secure route: Only authenticated personnel can create orders
router.post('/', createOrder);

export default router;
