import { z } from 'zod';
import { ANNEX_REFS } from '../models/Observation.js';

export const singleObservationSchema = z
  .object({
    annexRef: z.enum(ANNEX_REFS, {
      errorMap: () => ({ message: `annexRef must be one of: ${ANNEX_REFS.join(', ')}` }),
    }),
    evaluationMethod: z.enum(['mpe_band', 'manual_checklist']),
    referenceLoad: z.number().nonnegative().optional(),
    indicatedValue: z.number().nonnegative().optional(),
    checklistPassed: z.boolean().optional(),
    reviewerNotes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.evaluationMethod === 'mpe_band') {
      if (data.referenceLoad === undefined || data.referenceLoad === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'referenceLoad is required for mpe_band evaluation',
          path: ['referenceLoad'],
        });
      }
      if (data.indicatedValue === undefined || data.indicatedValue === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'indicatedValue is required for mpe_band evaluation',
          path: ['indicatedValue'],
        });
      }
      if (data.checklistPassed !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'checklistPassed should not be provided for mpe_band evaluation',
          path: ['checklistPassed'],
        });
      }
    } else if (data.evaluationMethod === 'manual_checklist') {
      if (data.checklistPassed === undefined || data.checklistPassed === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'checklistPassed is required for manual_checklist evaluation',
          path: ['checklistPassed'],
        });
      }
      if (data.referenceLoad !== undefined || data.indicatedValue !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'referenceLoad and indicatedValue should not be provided for manual_checklist evaluation',
          path: ['referenceLoad'],
        });
      }
    }
  });

export const addObservationsSchema = z.object({
  observations: z.array(singleObservationSchema).min(1, 'At least one observation required'),
});
