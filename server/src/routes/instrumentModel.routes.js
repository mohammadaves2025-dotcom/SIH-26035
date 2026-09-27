import { Router } from 'express';
import {
  createInstrumentModel,
  getInstrumentModels,
  getInstrumentModelById,
} from '../controllers/instrumentModel.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { createInstrumentModelSchema } from '../validators/instrumentModel.schema.js';

const router = Router();

router.use(authenticate);

router.post(
  '/',
  authorize('admin', 'lab_technician', 'lab_admin', 'doca_officer', 'manufacturer'),
  validate(createInstrumentModelSchema),
  createInstrumentModel
);
router.get('/', getInstrumentModels);
router.get('/:id', getInstrumentModelById);

export default router;
