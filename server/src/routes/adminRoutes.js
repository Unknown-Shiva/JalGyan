import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireAdmin } from '../middleware/adminMiddleware.js';
import { getDashboardStats } from '../controllers/adminDashboardController.js';
import {
  getPendingArticles,
  getArticleById,
  approveArticle,
  rejectArticle,
  getArticleReviews,
} from '../controllers/articleReviewController.js';

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

// Article Review & Moderation Endpoints (Requires valid JWT with role === 'ADMIN')
// GET /api/admin/articles/pending - Paginated list of pending articles
router.get('/articles/pending', requireAuth, requireAdmin, getPendingArticles);

// GET /api/admin/articles/:id - Complete article details with review history
router.get('/articles/:id', requireAuth, requireAdmin, getArticleById);

// PATCH /api/admin/articles/:id/approve - Approve pending article
router.patch('/articles/:id/approve', requireAuth, requireAdmin, approveArticle);

// PATCH /api/admin/articles/:id/reject - Reject pending article with reason
router.patch('/articles/:id/reject', requireAuth, requireAdmin, rejectArticle);

// GET /api/admin/articles/:id/reviews - Chronological review history for article
router.get('/articles/:id/reviews', requireAuth, requireAdmin, getArticleReviews);

export default router;
