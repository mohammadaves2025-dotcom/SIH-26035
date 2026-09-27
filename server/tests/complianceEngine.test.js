import { evaluateObservation, evaluateSession } from '../src/services/complianceEngine.service.js';

describe('Compliance Engine Service', () => {
  // Class III instrument example: Max=1500kg, e=0.5kg
  const instrument = {
    accuracyClass: 'III',
    maxCapacity: 1500,
    e: 0.5,
    minCapacity: 10,
    n: 3000,
  };

  const ruleConfig = {
    _id: 'rule_class_3_2006',
    oimlEdition: 'R76-1:2006',
    accuracyClass: 'III',
    effectiveDate: new Date('2006-01-01'),
    bands: [
      { uptoMultipleOfE: 500, mpeFactor: 0.5 },    // 0 to 250kg -> mpe = 0.25kg
      { uptoMultipleOfE: 2000, mpeFactor: 1.0 },   // 250kg to 1000kg -> mpe = 0.5kg
      { uptoMultipleOfE: 10000, mpeFactor: 1.5 },  // 1000kg to 5000kg -> mpe = 0.75kg
    ],
  };

  test('pass within lowest band', () => {
    // reference 200kg, indicated 200.15kg -> loadInE = 400 (<=500e), mpe = 0.5 * 0.5 = 0.25kg, error = 0.15kg (<=0.25)
    const result = evaluateObservation(
      { evaluationMethod: 'mpe_band', referenceLoad: 200, indicatedValue: 200.15 },
      instrument,
      ruleConfig
    );
    expect(result.outcome).toBe('pass');
    expect(result.computedError).toBeCloseTo(0.15);
    expect(result.appliedMpe).toBe(0.25);
  });

  test('fail above highest band', () => {
    // reference 1400kg, indicated 1401.20kg -> loadInE = 2800 (<=10000e), mpe = 1.5 * 0.5 = 0.75kg, error = 1.20kg (>0.75)
    const result = evaluateObservation(
      { evaluationMethod: 'mpe_band', referenceLoad: 1400, indicatedValue: 1401.20 },
      instrument,
      ruleConfig
    );
    expect(result.outcome).toBe('fail');
    expect(result.computedError).toBeCloseTo(1.20);
    expect(result.appliedMpe).toBe(0.75);
  });

  test('exact boundary is inclusive on lower band', () => {
    // reference load exactly at 250kg = 500e.
    // loadInE = 500. Should match band 500e (mpeFactor 0.5), appliedMpe = 0.25kg.
    // indicated = 250.25 -> error = 0.25 -> pass
    const resultInclusivePass = evaluateObservation(
      { evaluationMethod: 'mpe_band', referenceLoad: 250, indicatedValue: 250.25 },
      instrument,
      ruleConfig
    );
    expect(resultInclusivePass.outcome).toBe('pass');
    expect(resultInclusivePass.appliedMpe).toBe(0.25);

    // indicated = 250.30 -> error = 0.30 (> 0.25) -> fail
    const resultInclusiveFail = evaluateObservation(
      { evaluationMethod: 'mpe_band', referenceLoad: 250, indicatedValue: 250.30 },
      instrument,
      ruleConfig
    );
    expect(resultInclusiveFail.outcome).toBe('fail');
    expect(resultInclusiveFail.appliedMpe).toBe(0.25);
  });

  test('session fails if any single observation fails, even if others pass', () => {
    expect(
      evaluateSession([{ outcome: 'pass' }, { outcome: 'pass' }, { outcome: 'fail' }])
    ).toBe('fail');
  });

  test('session passes if all observations pass', () => {
    expect(
      evaluateSession([{ outcome: 'pass' }, { outcome: 'pass' }, { outcome: 'pass' }])
    ).toBe('pass');
  });

  test('manual checklist observation pass/fail outcome', () => {
    const passCheck = evaluateObservation(
      { evaluationMethod: 'manual_checklist', checklistPassed: true },
      instrument,
      ruleConfig
    );
    expect(passCheck.outcome).toBe('pass');

    const failCheck = evaluateObservation(
      { evaluationMethod: 'manual_checklist', checklistPassed: false },
      instrument,
      ruleConfig
    );
    expect(failCheck.outcome).toBe('fail');
  });
});
