import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { listBookmarks } from '../controllers/bookmarkController.js';

const router = Router();
router.get('/', requireAuth, listBookmarks);

export default router;
