import { Router } from 'express';
import { submitReport } from '../controllers/userReportController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();
router.post('/', requireAuth, submitReport);

export default router;
