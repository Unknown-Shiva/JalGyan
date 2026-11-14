import { Router } from 'express';
import { listArticles } from '../controllers/articleController.js';
import { optionalAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', optionalAuth, listArticles);

export default router;
