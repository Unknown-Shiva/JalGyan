import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireAdmin } from '../middleware/adminMiddleware.js';

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

export default router;
