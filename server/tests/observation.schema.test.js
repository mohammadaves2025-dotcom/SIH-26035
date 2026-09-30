import { createSingleObservationValidator } from '../src/validators/observation.schema.js';

describe('Observation reading validation', () => {
  const mpeValidator = createSingleObservationValidator({ testCriteria: [] });
  const structuredValidator = createSingleObservationValidator({
    testCriteria: [{
      annexRef: 'A4_repeatability',
      fields: [
        { name: 'load', required: true },
        { name: 'indicated', required: true },
      ],
      criterion: { type: 'range_le_mpe_factor' },
    }],
  });
  const manualValidator = createSingleObservationValidator({
    testCriteria: [{
      annexRef: 'A1_administrative',
      fields: [],
      criterion: { type: 'manual' },
    }],
  });

  test('requires two complete accuracy reading pairs', () => {
    const incomplete = mpeValidator.safeParse({
      annexRef: 'A4_accuracy',
      evaluationMethod: 'mpe_band',
      referenceLoad: 10,
      indicatedValue: 10,
      readings: [{ reference: 10, indicated: 10 }],
    });
    expect(incomplete.success).toBe(false);
    expect(incomplete.error.issues.some(({ message }) => message.includes('at least two readings'))).toBe(true);

    const complete = mpeValidator.safeParse({
      annexRef: 'A4_accuracy',
      evaluationMethod: 'mpe_band',
      referenceLoad: 10,
      indicatedValue: 10,
      readings: [
        { reference: 10, indicated: 10 },
        { reference: 20, indicated: 20 },
      ],
    });
    expect(complete.success).toBe(true);
  });

  test('requires two complete readings for structured measurement criteria', () => {
    const incomplete = structuredValidator.safeParse({
      annexRef: 'A4_repeatability',
      evaluationMethod: 'structured',
      readings: [{ load: 10, indicated: 10 }],
    });
    expect(incomplete.success).toBe(false);

    const complete = structuredValidator.safeParse({
      annexRef: 'A4_repeatability',
      evaluationMethod: 'structured',
      readings: [
        { load: 10, indicated: 10 },
        { load: 10, indicated: 10.01 },
      ],
    });
    expect(complete.success).toBe(true);
  });

  test('keeps checklist-only criteria on checklist evidence rather than numeric readings', () => {
    const result = manualValidator.safeParse({
      annexRef: 'A1_administrative',
      evaluationMethod: 'structured',
      checklistPassed: true,
      reviewerNotes: 'Documents verified',
      readings: [],
    });
    expect(result.success).toBe(true);
  });
});
