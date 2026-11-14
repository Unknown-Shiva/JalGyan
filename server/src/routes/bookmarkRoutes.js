import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { listBookmarks, addBookmark, removeBookmark } from '../controllers/bookmarkController.js';

const router = Router();
router.get('/', requireAuth, listBookmarks);
router.post('/:articleId', requireAuth, addBookmark);
router.delete('/:articleId', requireAuth, removeBookmark);

export default router;
