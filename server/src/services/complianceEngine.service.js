import { AppError } from '../utils/AppError.js';

function decimalPlaces(value) {
  const [, fraction = '', exponentPart] = String(value).toLowerCase().split(/[e]/);
  const exponent = exponentPart ? Number(exponentPart) : 0;
  return Math.max(0, fraction.length - exponent);
}

export function evaluateObservation(observation, instrumentModel, ruleConfig) {
  if (observation.evaluationMethod === 'manual_checklist') {
    const outcome = observation.checklistPassed ? 'pass' : 'fail';
    return { outcome };
  }

  const annexRef = observation.annexRef || 'A4_accuracy';
  if (annexRef !== 'A4_accuracy') {
    throw new AppError(422, 'UNSUPPORTED_TEST_METHOD', 'Automatic MPE calculation is currently implemented only for A4 accuracy observations');
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

  if (!Number.isFinite(observation.referenceLoad) || !Number.isFinite(observation.indicatedValue)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Observation values must be finite numbers');
  }
  if (observation.zeroCorrection != null && !Number.isFinite(observation.zeroCorrection)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'zeroCorrection must be a finite number');
  }
  if (!Number.isFinite(instrumentModel.e) || instrumentModel.e <= 0 ||
      !Number.isFinite(instrumentModel.maxCapacity) || instrumentModel.maxCapacity <= 0) {
    throw new AppError(422, 'INVALID_INSTRUMENT_PARAMETERS', 'Instrument capacity and verification interval must be positive');
  }
  if (observation.referenceLoad > instrumentModel.maxCapacity) {
    throw new AppError(422, 'LOAD_OUT_OF_RANGE', 'Reference load exceeds the instrument maximum capacity');
  }

  const zeroCorr = observation.zeroCorrection || 0;
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
  const computedError = observation.indicatedValue - observation.referenceLoad - zeroCorr;
  const outcome = Math.abs(computedError) <= appliedMpe + 1e-9 ? 'pass' : 'fail';

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
