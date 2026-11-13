import { Router } from 'express';
import { login, register, getMe, updateMe } from '../controllers/authController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

// POST /api/auth/login
router.post('/login', login);

// POST /api/auth/register
router.post('/register', register);

// GET /api/auth/me (Protected)
router.get('/me', requireAuth, getMe);
router.patch('/me', requireAuth, updateMe);

export default router;
