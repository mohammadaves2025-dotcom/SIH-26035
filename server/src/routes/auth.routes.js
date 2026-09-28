import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { register, login } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { registerSchema, loginSchema } from '../validators/auth.schema.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // 15 attempts per IP per 15 minutes
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many login attempts from this IP, please try again after 15 minutes',
    },
  },
});

router.post('/register', authenticate, authorize('admin'), validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);

export default router;
