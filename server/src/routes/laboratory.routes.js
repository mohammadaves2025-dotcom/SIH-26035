import { Router } from 'express';
import { getLaboratories, createLaboratory } from '../controllers/laboratory.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

router.use(authenticate);

router.get('/', getLaboratories);
router.post('/', authorize('admin', 'lab_admin', 'doca_officer'), createLaboratory);

export default router;
