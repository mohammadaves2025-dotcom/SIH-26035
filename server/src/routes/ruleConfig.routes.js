import { Router } from 'express';
import { createRuleConfig, getRuleConfigs } from '../controllers/ruleConfig.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { createRuleConfigSchema } from '../validators/ruleConfig.schema.js';

const router = Router();

router.use(authenticate);

router.post('/', authorize('admin', 'lab_admin', 'doca_officer'), validate(createRuleConfigSchema), createRuleConfig);
router.get('/', authorize('admin', 'reviewer', 'lab_admin', 'doca_officer', 'auditor', 'lab_technician'), getRuleConfigs);

export default router;
