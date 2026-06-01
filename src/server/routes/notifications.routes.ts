import { Router } from 'express';
import { getNotifications, createNotification, markAsRead } from '../controllers/notifications.controller.js';
import { requireAuth, requireActiveSubscription } from '../middleware/auth.middleware.js';

const router = Router();

router.use(requireAuth);
router.use(requireActiveSubscription);

router.get('/', getNotifications);
router.post('/', createNotification);
router.patch('/:id/read', markAsRead);

export default router;
