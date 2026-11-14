import { Router } from 'express';
import {
  listArticles,
  getArticleBySlugOrId,
  createArticle,
  updateArticle,
  deleteArticle,
} from '../controllers/articleController.js';
import { optionalAuth, requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', optionalAuth, listArticles);
router.get('/:slugOrId', optionalAuth, getArticleBySlugOrId);
router.post('/', requireAuth, createArticle);
router.put('/:id', requireAuth, updateArticle);
router.patch('/:id', requireAuth, updateArticle);
router.delete('/:id', requireAuth, deleteArticle);

export default router;
