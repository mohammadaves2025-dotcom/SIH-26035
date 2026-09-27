import { z } from 'zod';

export const createTestSessionSchema = z
  .object({
    instrumentModelId: z.string().min(1, 'instrumentModelId is required'),
    serialNumber: z.string().optional(),
    accuracyClass: z.string().optional(),
    maxCapacity: z.number().optional(),
    minCapacity: z.number().optional(),
    scaleInterval: z.number().optional(),
    selectedAnnexes: z.array(z.string()).optional(),
    testDate: z.string().or(z.date()).optional().transform((val) => (val ? new Date(val) : new Date())),
    labId: z.string().optional(),
    environmentalConditions: z
      .object({
        temperatureC: z.number().optional(),
        humidityPercent: z.number().optional(),
        inclinationDeg: z.number().optional(),
        atmosphericPressurehPa: z.number().optional(),
        notes: z.string().optional(),
      })
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.testDate && data.testDate > new Date(Date.now() + 86400000)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'testDate cannot be in the future',
        path: ['testDate'],
      });
    }
  });
