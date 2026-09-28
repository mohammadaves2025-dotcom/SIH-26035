import { AppError } from '../utils/AppError.js';

const DECIMAL_SCALE = 1_000_000_000n;
const DECIMAL_SCALE_NUMBER = Number(DECIMAL_SCALE);

function toScaledInteger(value, label) {
  const scaled = value * DECIMAL_SCALE_NUMBER;
  if (!Number.isSafeInteger(Math.round(scaled)) || Math.abs(scaled - Math.round(scaled)) > 1e-6) {
    throw new AppError(422, 'VALUE_PRECISION_EXCEEDED', `${label} exceeds the supported range or nine decimal places`);
  }
  return BigInt(Math.round(scaled));
}

export function evaluateObservation(observation, instrumentModel, ruleConfig, verificationStage = 'initial') {
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
  const referenceLoadScaled = toScaledInteger(observation.referenceLoad, 'referenceLoad');
  const indicatedValueScaled = toScaledInteger(observation.indicatedValue, 'indicatedValue');
  const eScaled = toScaledInteger(instrumentModel.e, 'verification interval');
  const maxCapacityScaled = toScaledInteger(instrumentModel.maxCapacity, 'maximum capacity');
  if (referenceLoadScaled > maxCapacityScaled) {
    throw new AppError(422, 'LOAD_OUT_OF_RANGE', 'Reference load exceeds the instrument maximum capacity');
  }

  const zeroCorrectionScaled = toScaledInteger(observation.zeroCorrection || 0, 'zeroCorrection');

  // Sort bands by upper limit ascending
  const sortedBands = ruleConfig.bands
    .slice()
    .sort((a, b) => a.uptoMultipleOfE - b.uptoMultipleOfE);

  const band = sortedBands.find((b) => maxCapacityScaled <= BigInt(b.uptoMultipleOfE) * eScaled);

  if (!band) {
    throw new AppError(
      422,
      'LOAD_OUT_OF_RANGE',
      'Reference load exceeds all defined bands for this rule configuration'
    );
  }

  // OIML R 76 §3.5: In-service / subsequent verification MPE limits are 2x initial limits
  const stageMultiplier = verificationStage === 'subsequent' ? 2n : 1n;
  const factorScaled = toScaledInteger(band.mpeFactor, 'MPE factor') * stageMultiplier;
  const errorScaled = indicatedValueScaled - referenceLoadScaled - zeroCorrectionScaled;
  const withinMpe = (errorScaled < 0n ? -errorScaled : errorScaled) * DECIMAL_SCALE <= factorScaled * eScaled;
  const appliedMpe = Number(factorScaled * eScaled) / (DECIMAL_SCALE_NUMBER * DECIMAL_SCALE_NUMBER);
  const computedError = Number(errorScaled) / DECIMAL_SCALE_NUMBER;
  const outcome = withinMpe ? 'pass' : 'fail';

  // §9.3 step 4: margin and error ratio
  const marginToMpe = appliedMpe - Math.abs(computedError);
  const eValue = Number(eScaled) / DECIMAL_SCALE_NUMBER;
  const errorRatioE = eValue !== 0 ? computedError / eValue : null;

  return {
    computedError,
    appliedMpe,
    marginToMpe,
    errorRatioE,
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
