import { Router } from 'express';
import { register } from '../controllers/auth.controller.js';
import { requireAuth, requireRoles } from '../middleware/auth.middleware.js';

const router = Router();

// Only admin can create new manager/driver accounts
router.post('/register', requireAuth, requireRoles(['admin']), register);

// Example role protected route
router.get('/admin-only', requireAuth, requireRoles(['admin']), (req, res) => {
  res.json({ message: 'Welcome to the Admin panel.' });
});

export default router;
