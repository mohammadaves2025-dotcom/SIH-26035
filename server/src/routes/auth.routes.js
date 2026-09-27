import { Router } from 'express';
import { register, login } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { registerSchema, loginSchema } from '../validators/auth.schema.js';

const router = Router();

router.post('/register', authenticate, authorize('admin'), validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);

export default router;
