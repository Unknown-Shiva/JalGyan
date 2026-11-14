import { Router } from 'express';
import { listArticles, getArticleBySlugOrId, createArticle } from '../controllers/articleController.js';
import { optionalAuth, requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', optionalAuth, listArticles);
router.get('/:slugOrId', optionalAuth, getArticleBySlugOrId);
router.post('/', requireAuth, createArticle);

export default router;
