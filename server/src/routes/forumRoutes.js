import { Router } from 'express';
import { listForumPosts, getForumPost, createForumPost, updateForumPost, deleteForumPost } from '../controllers/forumPostController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { createPostComment } from '../controllers/forumCommentController.js';

const router = Router();
router.get('/', listForumPosts);
router.get('/:id', getForumPost);
router.post('/', requireAuth, createForumPost);
router.post('/:id/comments', requireAuth, createPostComment);
router.patch('/:id', requireAuth, updateForumPost);
router.delete('/:id', requireAuth, deleteForumPost);

export default router;
