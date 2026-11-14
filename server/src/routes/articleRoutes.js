import { Router } from 'express';
import {
  listArticles,
  getArticleBySlugOrId,
  createArticle,
  updateArticle,
  deleteArticle,
  getMyArticles,
  submitArticleForReview,
} from '../controllers/articleController.js';
import { optionalAuth, requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

// Public / list routes
router.get('/', optionalAuth, listArticles);

// Author-specific route (MUST precede /:slugOrId to prevent being matched as slug)
router.get('/my', requireAuth, getMyArticles);

// Article detail route
router.get('/:slugOrId', optionalAuth, getArticleBySlugOrId);

// Creation, update, submission, and deletion
router.post('/', requireAuth, createArticle);
router.patch('/:id/submit', requireAuth, submitArticleForReview);
router.put('/:id', requireAuth, updateArticle);
router.patch('/:id', requireAuth, updateArticle);
router.delete('/:id', requireAuth, deleteArticle);

export default router;
