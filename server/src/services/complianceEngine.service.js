import { AppError } from '../utils/AppError.js';

export function evaluateObservation(observation, instrumentModel, ruleConfig) {
  if (observation.evaluationMethod === 'manual_checklist') {
    const outcome = observation.checklistPassed ? 'pass' : 'fail';
    return { outcome };
  }

  if (
    observation.referenceLoad === undefined ||
    observation.referenceLoad === null ||
    observation.indicatedValue === undefined ||
    observation.indicatedValue === null
  ) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'referenceLoad and indicatedValue are required for mpe_band evaluation'
    );
  }

  const loadInE = observation.referenceLoad / instrumentModel.e;

  // Sort bands by upper limit ascending
  const sortedBands = ruleConfig.bands
    .slice()
    .sort((a, b) => a.uptoMultipleOfE - b.uptoMultipleOfE);

  const band = sortedBands.find((b) => loadInE <= b.uptoMultipleOfE);

  if (!band) {
    throw new AppError(
      422,
      'LOAD_OUT_OF_RANGE',
      'Reference load exceeds all defined bands for this rule configuration'
    );
  }

  const appliedMpe = band.mpeFactor * instrumentModel.e;
  const computedError = observation.indicatedValue - observation.referenceLoad;
  const outcome = Math.abs(computedError) <= appliedMpe ? 'pass' : 'fail';

  return {
    computedError,
    appliedMpe,
    outcome,
    ruleConfigId: ruleConfig._id,
  };
}

export function evaluateSession(observations) {
  if (!observations || observations.length === 0) {
    throw new AppError(
      422,
      'NO_OBSERVATIONS',
      'Cannot evaluate a session with zero observations'
    );
  }

  return observations.every((o) => o.outcome === 'pass') ? 'pass' : 'fail';
}
