import { Router } from 'express';
import { requireAuth, optionalAuth } from '../middleware/authMiddleware.js';
import {
  calculateWater,
  getCalculationHistory,
  getCalculationById,
} from '../controllers/calculatorController.js';

const router = Router();

// POST /api/calculator/calculate — open to guests & authenticated users
router.post('/calculate', optionalAuth, calculateWater);

// GET /api/calculator/history — user's own calculation history
router.get('/history', requireAuth, getCalculationHistory);

// GET /api/calculator/history/:id — user's calculation detail
router.get('/history/:id', requireAuth, getCalculationById);

export default router;
