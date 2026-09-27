import { z } from 'zod';
import { ROLES } from '../models/User.js';

export const registerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  role: z.enum(['lab_technician', 'reviewer', 'manufacturer'], {
    errorMap: () => ({ message: 'Role must be lab_technician, reviewer, or manufacturer' }),
  }),
  labId: z.string().trim().min(1).optional().nullable(),
}).superRefine((data, ctx) => {
  if (['lab_technician', 'reviewer'].includes(data.role) && !data.labId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'A laboratory assignment is required for this role', path: ['labId'] });
  }
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});
