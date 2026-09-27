import { Router } from 'express';
import {
  listReports,
  createReport,
  getReportById,
  downloadReportFile,
  revokeReport,
} from '../controllers/report.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

router.use(authenticate);

router.get('/', listReports);
router.post('/:sessionId/generate', authorize('admin', 'reviewer', 'lab_admin', 'doca_officer'), createReport);
router.get('/:id', getReportById);
router.get('/:id/download/:format', downloadReportFile);
router.post('/:id/revoke', authorize('admin', 'reviewer', 'lab_admin', 'doca_officer'), revokeReport);

export default router;
