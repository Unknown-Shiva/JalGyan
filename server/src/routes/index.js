import { Router } from 'express';
import healthRoutes from './healthRoutes.js';
import authRoutes from './authRoutes.js';
import adminRoutes from './adminRoutes.js';
import forumRoutes from './forumRoutes.js';
import commentRoutes from './commentRoutes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/posts', forumRoutes);
router.use('/comments', commentRoutes);

export default router;
