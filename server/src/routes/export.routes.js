import { Router } from 'express';
import { exportLegalMetrologyData } from '../controllers/export.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

router.use(authenticate);

router.get('/legal-metrology', authorize('admin', 'lab_admin', 'doca_officer', 'auditor'), exportLegalMetrologyData);

export default router;
