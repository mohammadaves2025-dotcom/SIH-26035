import { Router } from 'express';
import { getTestTypes } from '../controllers/testType.controller.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

router.use(authenticate);

router.get('/', getTestTypes);

export default router;
