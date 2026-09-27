import { Router } from 'express';
import { createManufacturer, getManufacturers } from '../controllers/manufacturer.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

router.use(authenticate);

router.post('/', authorize('admin', 'lab_technician', 'lab_admin', 'doca_officer'), createManufacturer);
router.get('/', getManufacturers);

export default router;
