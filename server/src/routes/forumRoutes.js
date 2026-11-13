import { Router } from 'express';
import { listForumPosts, getForumPost } from '../controllers/forumPostController.js';

const router = Router();
router.get('/', listForumPosts);
router.get('/:id', getForumPost);

export default router;
