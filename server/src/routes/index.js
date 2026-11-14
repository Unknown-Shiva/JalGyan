import { Router } from 'express';
import healthRoutes from './healthRoutes.js';
import authRoutes from './authRoutes.js';
import adminRoutes from './adminRoutes.js';
import forumRoutes from './forumRoutes.js';
import commentRoutes from './commentRoutes.js';
import bookmarkRoutes from './bookmarkRoutes.js';
import userReportRoutes from './userReportRoutes.js';
import categoryRoutes from './categoryRoutes.js';
import articleRoutes from './articleRoutes.js';
import resourceRoutes from './resourceRoutes.js';
import calculatorRoutes from './calculatorRoutes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/posts', forumRoutes);
router.use('/comments', commentRoutes);
router.use('/bookmarks', bookmarkRoutes);
router.use('/reports', userReportRoutes);
router.use('/categories', categoryRoutes);
router.use('/articles', articleRoutes);
router.use('/resources', resourceRoutes);
router.use('/calculator', calculatorRoutes);

export default router;
