import { Router } from 'express';
import {
  createTestSession,
  addObservations,
  submitTestSession,
  approveTestSession,
  rejectTestSession,
  getTestSessions,
  getTestSessionById,
} from '../controllers/testSession.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { createTestSessionSchema } from '../validators/testSession.schema.js';
import { addObservationsSchema } from '../validators/observation.schema.js';

const router = Router();

router.use(authenticate);

router.post(
  '/',
  authorize('admin', 'lab_technician', 'lab_admin'),
  validate(createTestSessionSchema),
  createTestSession
);

router.post(
  '/:id/observations',
  authorize('admin', 'lab_technician', 'lab_admin'),
  validate(addObservationsSchema),
  addObservations
);

router.post(
  '/:id/submit',
  authorize('admin', 'lab_technician', 'lab_admin'),
  submitTestSession
);

router.post(
  '/:id/approve',
  authorize('admin', 'reviewer'),
  approveTestSession
);

router.post(
  '/:id/reject',
  authorize('admin', 'reviewer'),
  rejectTestSession
);

router.get('/', getTestSessions);
router.get('/:id', getTestSessionById);

export default router;
