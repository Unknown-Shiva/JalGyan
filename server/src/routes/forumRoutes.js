import { Router } from 'express';
import { listForumPosts, getForumPost, createForumPost } from '../controllers/forumPostController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();
router.get('/', listForumPosts);
router.get('/:id', getForumPost);
router.post('/', requireAuth, createForumPost);

export default router;
