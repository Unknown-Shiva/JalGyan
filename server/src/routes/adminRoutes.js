import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireAdmin } from '../middleware/adminMiddleware.js';
import { getDashboardStats } from '../controllers/adminDashboardController.js';

const router = Router();

// GET /api/admin/verify (Requires valid JWT with role === 'ADMIN')
router.get('/verify', requireAuth, requireAdmin, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Admin authorization verified successfully.',
    data: {
      admin: req.user,
    },
  });
});

// GET /api/admin/dashboard/stats (Requires valid JWT with role === 'ADMIN')
router.get('/dashboard/stats', requireAuth, requireAdmin, getDashboardStats);

export default router;
