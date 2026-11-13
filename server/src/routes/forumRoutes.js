import { Router } from 'express';
import { listForumPosts } from '../controllers/forumPostController.js';

const router = Router();
router.get('/', listForumPosts);

export default router;
