import { Router } from 'express';
import { activateRuleConfig, createRuleConfig, getRuleConfigs, sandboxRuleConfig } from '../controllers/ruleConfig.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { activateRuleConfigSchema, createRuleConfigSchema } from '../validators/ruleConfig.schema.js';

const router = Router();

router.use(authenticate);

router.post('/', authorize('admin'), validate(createRuleConfigSchema), createRuleConfig);
router.post('/:id/activate', authorize('metrology_expert'), validate(activateRuleConfigSchema), activateRuleConfig);
router.post('/:id/sandbox', authorize('metrology_expert'), sandboxRuleConfig);
router.get('/', authorize('admin', 'metrology_expert', 'reviewer', 'lab_admin', 'doca_officer', 'auditor', 'lab_technician'), getRuleConfigs);

export default router;
