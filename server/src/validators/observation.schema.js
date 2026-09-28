import { z } from 'zod';
import { ANNEX_REFS } from '../models/Observation.js';

const METHOD_BY_ANNEX = Object.fromEntries(
  ANNEX_REFS.map((annex) => [annex, annex === 'A4_accuracy' ? 'mpe_band' : 'manual_checklist'])
);

export const singleObservationSchema = z
  .object({
    annexRef: z.enum(ANNEX_REFS, {
      errorMap: () => ({ message: `annexRef must be one of: ${ANNEX_REFS.join(', ')}` }),
    }),
    evaluationMethod: z.enum(['mpe_band', 'manual_checklist']),
    referenceLoad: z.number().finite().nonnegative().optional(),
    indicatedValue: z.number().finite().optional(),
    zeroCorrection: z.number().finite().optional(),
    checklistPassed: z.boolean().optional(),
    reviewerNotes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (METHOD_BY_ANNEX[data.annexRef] !== data.evaluationMethod) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${data.annexRef} requires ${METHOD_BY_ANNEX[data.annexRef]} evaluation in this implementation`,
        path: ['evaluationMethod'],
      });
    }
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
      if (data.zeroCorrection !== undefined && !Number.isFinite(data.zeroCorrection)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'zeroCorrection must be finite', path: ['zeroCorrection'] });
      }
    } else if (data.evaluationMethod === 'manual_checklist') {
      if (data.checklistPassed === undefined || data.checklistPassed === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'checklistPassed is required for manual_checklist evaluation',
          path: ['checklistPassed'],
        });
      }
      if (!data.reviewerNotes?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'reviewerNotes is required for manual_checklist evaluation', path: ['reviewerNotes'] });
      }
      if (data.annexRef === 'B_electronic_additional' && (data.reviewerNotes?.trim().length || 0) < 5) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Annex B electronic tests require descriptive reviewer notes detailing test conditions (e.g. voltage, ESD, immunity)', path: ['reviewerNotes'] });
      }
      if (data.referenceLoad !== undefined || data.indicatedValue !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'referenceLoad and indicatedValue should not be provided for manual_checklist evaluation',
          path: ['referenceLoad'],
        });
      }
      if (data.zeroCorrection !== undefined) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'zeroCorrection applies only to mpe_band evaluation', path: ['zeroCorrection'] });
      }
    }
  });

export const addObservationsSchema = z.object({
  observations: z.array(singleObservationSchema).min(1, 'At least one observation required'),
});
