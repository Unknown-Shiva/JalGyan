import { Router } from 'express';
import { listArticles, getArticleBySlugOrId } from '../controllers/articleController.js';
import { optionalAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', optionalAuth, listArticles);
router.get('/:slugOrId', optionalAuth, getArticleBySlugOrId);

export default router;
