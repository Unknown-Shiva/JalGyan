import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { updateComment, deleteComment } from '../controllers/forumCommentController.js';

const router = Router();
router.patch('/:id', requireAuth, updateComment);
router.delete('/:id', requireAuth, deleteComment);

export default router;
