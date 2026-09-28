import { Observation } from '../models/Observation.js';
import { TestSession } from '../models/TestSession.js';

function median(arr) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export async function detectObservationAnomalies(observation, session) {
  if (observation.evaluationMethod !== 'mpe_band' || observation.errorRatioE === undefined || observation.errorRatioE === null) {
    return observation;
  }

  // Find all test sessions with the same instrument model
  const historicalSessions = await TestSession.find({
    instrumentModelId: session.instrumentModelId,
    _id: { $ne: session._id },
    status: { $in: ['under_review', 'passed', 'failed'] },
  }).select('_id');

  if (!historicalSessions.length) return observation;

  const sessionIds = historicalSessions.map((s) => s._id);

  // Find prior observations for the same model and same annex/reference load
  const priorObs = await Observation.find({
    testSessionId: { $in: sessionIds },
    deletedAt: null,
    annexRef: observation.annexRef,
    evaluationMethod: 'mpe_band',
    errorRatioE: { $ne: null },
  }).select('errorRatioE');

  if (priorObs.length < 10) {
    return observation; // Requires >= 10 prior observations per spec
  }

  const values = priorObs.map((o) => o.errorRatioE);
  const med = median(values);
  const absDeviations = values.map((v) => Math.abs(v - med));
  const mad = median(absDeviations);

  const x = observation.errorRatioE;
  let zScore = 0;
  if (mad > 0) {
    zScore = (0.6745 * (x - med)) / mad;
  } else if (x !== med) {
    zScore = 99.0;
  }

  if (Math.abs(zScore) > 3.5) {
    observation.advisoryFlags = [
      {
        flagType: 'ANOMALY_ERROR_RATIO',
        zScore: Number(zScore.toFixed(2)),
        message: `Error ratio (${x.toFixed(3)}) deviates significantly from model median (${med.toFixed(3)}), Z=${zScore.toFixed(2)}`,
        acknowledged: false,
      },
    ];
  }

  return observation;
}
