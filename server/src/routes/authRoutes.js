import { Router } from 'express';
import { login, getMe } from '../controllers/authController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

// POST /api/auth/login
router.post('/login', login);

// GET /api/auth/me (Protected)
router.get('/me', requireAuth, getMe);

export default router;
