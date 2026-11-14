import { Router } from 'express';
import { listEducationalResources } from '../controllers/resourceController.js';

const router = Router();

// Public educational resource library
router.get('/', listEducationalResources);

export default router;
