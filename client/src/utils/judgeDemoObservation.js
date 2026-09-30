export function buildJudgeDemoObservation({
  annexRef,
  evaluationMethod,
  criterionType,
  fields = [],
  minimumRows = 1,
  maxCapacity,
  minCapacity = 0,
  scaleInterval,
}) {
  if (evaluationMethod === 'structured') {
    if (criterionType === 'manual') {
      return {
        annexRef,
        evaluationMethod,
        readings: [{}],
        checklistPassed: true,
        reviewerNotes: 'Judge demo sample only; replace with actual inspection evidence.',
      };
    }

    const load = getDemoLoad(maxCapacity, minCapacity, scaleInterval);
    const readings = Array.from({ length: minimumRows }, () => {
      const reading = {};
      fields.forEach((field) => {
        if (field.type === 'boolean') {
          reading[field.name] = true;
        } else if (field.type === 'string') {
          reading[field.name] = demoStringValue(field.name);
        } else {
          reading[field.name] = demoNumberValue(field.name, load);
        }
      });
      return reading;
    });

    return { annexRef, evaluationMethod, readings };
  }

  if (evaluationMethod === 'manual_checklist') {
    return {
      annexRef,
      evaluationMethod,
      checklistPassed: true,
      reviewerNotes: 'Judge demo sample only; replace with actual inspection evidence.',
    };
  }

  const referenceLoad = getDemoLoad(maxCapacity, minCapacity, scaleInterval);
  return {
    annexRef,
    evaluationMethod: 'mpe_band',
    referenceLoad: String(referenceLoad),
    indicatedValue: String(referenceLoad),
    zeroCorrection: '0',
  };
}

function getDemoLoad(maxCapacity, minCapacity, scaleInterval) {
  const max = Number(maxCapacity);
  const min = Number(minCapacity);
  const interval = Number(scaleInterval);
  const midpoint = Number.isFinite(max) && max > 0 ? max / 2 : 1;
  const lowerBound = Number.isFinite(min) && min >= 0 ? min : 0;
  const rawLoad = Math.max(lowerBound, midpoint);

  if (!Number.isFinite(interval) || interval <= 0) return rawLoad;
  return Math.max(lowerBound, Math.round(rawLoad / interval) * interval);
}

function demoStringValue(fieldName) {
  const name = fieldName.toLowerCase();
  if (name.includes('position')) return 'Center (demo)';
  if (name.includes('condition')) return 'Stable test condition (demo)';
  return 'Demo sample';
}

function demoNumberValue(fieldName, load) {
  const name = fieldName.toLowerCase();
  if (name.includes('load') || name === 'reference' || name === 'indicated') return load;
  return 0;
}
