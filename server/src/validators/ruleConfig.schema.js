import { z } from 'zod';

export const createRuleConfigSchema = z
  .object({
    oimlEdition: z.string().min(1, 'oimlEdition is required'),
    accuracyClass: z.enum(['I', 'II', 'III', 'IIII']),
    effectiveDate: z.string().or(z.date()).transform((val) => new Date(val)),
    bands: z
      .array(
        z.object({
          uptoMultipleOfE: z.number().positive(),
          mpeFactor: z.number().positive(),
        })
      )
      .min(1, 'At least one band must be defined'),
  })
  .superRefine((data, ctx) => {
    for (let i = 1; i < data.bands.length; i++) {
      if (data.bands[i].uptoMultipleOfE <= data.bands[i - 1].uptoMultipleOfE) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Band upper limit at index ${i} must be strictly greater than index ${i - 1}`,
          path: ['bands', i, 'uptoMultipleOfE'],
        });
      }
    }
  });
