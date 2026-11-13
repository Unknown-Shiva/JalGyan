import { Router } from 'express';
import { listForumPosts, getForumPost, createForumPost, updateForumPost, deleteForumPost } from '../controllers/forumPostController.js';
import { requireAuth, optionalAuth } from '../middleware/authMiddleware.js';
import { createPostComment } from '../controllers/forumCommentController.js';
import { togglePostVote } from '../controllers/forumVoteController.js';

const router = Router();
router.get('/', optionalAuth, listForumPosts);
router.get('/:id', optionalAuth, getForumPost);
router.post('/', requireAuth, createForumPost);
router.post('/:id/comments', requireAuth, createPostComment);
router.post('/:id/vote', requireAuth, togglePostVote);
router.patch('/:id', requireAuth, updateForumPost);
router.delete('/:id', requireAuth, deleteForumPost);

export default router;
