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
import {
  listUsers,
  getUserById,
  suspendUser,
  activateUser,
  updateUserRole,
} from '../controllers/userManagementController.js';

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

// User Management Endpoints (Requires valid JWT with role === 'ADMIN')
// GET /api/admin/users - Paginated user list with filtering and search
router.get('/users', requireAuth, requireAdmin, listUsers);

// GET /api/admin/users/:id - Detailed user information with activity counts
router.get('/users/:id', requireAuth, requireAdmin, getUserById);

// PATCH /api/admin/users/:id/suspend - Suspend an active user
router.patch('/users/:id/suspend', requireAuth, requireAdmin, suspendUser);

// PATCH /api/admin/users/:id/activate - Reactivate a suspended user
router.patch('/users/:id/activate', requireAuth, requireAdmin, activateUser);

// PATCH /api/admin/users/:id/role - Update user role (USER or ADMIN)
router.patch('/users/:id/role', requireAuth, requireAdmin, updateUserRole);

export default router;
