import { Router } from 'express';
import { listCategories, getCategoryBySlug, createCategory } from '../controllers/categoryController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireAdmin } from '../middleware/adminMiddleware.js';

const router = Router();

router.get('/', listCategories);
router.get('/:slug', getCategoryBySlug);
router.post('/', requireAuth, requireAdmin, createCategory);

export default router;
