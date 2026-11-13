import { Router } from 'express';
import { listForumPosts, getForumPost, createForumPost, updateForumPost, deleteForumPost } from '../controllers/forumPostController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();
router.get('/', listForumPosts);
router.get('/:id', getForumPost);
router.post('/', requireAuth, createForumPost);
router.patch('/:id', requireAuth, updateForumPost);
router.delete('/:id', requireAuth, deleteForumPost);

export default router;
