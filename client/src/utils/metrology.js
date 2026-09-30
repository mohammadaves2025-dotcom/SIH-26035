export function formatMetrologyValue(value, signed = false) {
  if (value === undefined || value === null || value === '') return '-';
  const number = Number(value);
  if (!Number.isFinite(number)) return '-';
  const formatted = number.toFixed(6).replace(/\.?(0+)$/, '');
  return signed && number > 0 ? `+${formatted}` : formatted;
}

export function minimumReadingCount(criterion) {
  return criterion?.criterion?.type === 'manual' ? 1 : criterion ? 2 : 1;
}

export function hasCompleteMeasurementPairs(readings, minimumRows = 2) {
  const rows = readings || [];
  return rows.length >= minimumRows && rows.every((reading) =>
    reading.reference !== undefined &&
    reading.reference !== null &&
    String(reading.reference).trim() !== '' &&
    reading.indicated !== undefined &&
    reading.indicated !== null &&
    String(reading.indicated).trim() !== ''
  );
}

export function getProcedureMeasurementReadingCount(annexRef, observations, criterion) {
  if (criterion?.criterion?.type === 'manual') return Infinity;
  const relevant = (observations || []).filter((observation) => observation.annexRef === annexRef);
  if (!relevant.length) return 0;

  if (relevant.some((observation) => observation.evaluationMethod === 'manual_checklist')) {
    return Infinity;
  }

  if (relevant.some((observation) => observation.evaluationMethod === 'structured')) {
    return relevant.reduce((count, observation) => {
      const fields = criterion?.fields || [];
      const completeCount = (observation.readings || []).filter((reading) =>
        fields.filter((field) => field.required).every((field) =>
          reading[field.name] !== undefined &&
          reading[field.name] !== null &&
          String(reading[field.name]).trim() !== ''
        )
      ).length;
      return count + completeCount;
    }, 0);
  }

  return relevant.reduce((count, observation) => {
    const completeRows = (observation.readings || []).filter((reading) =>
      reading.reference !== undefined && reading.reference !== null &&
      reading.indicated !== undefined && reading.indicated !== null
    ).length;
    return count + Math.max(completeRows, observation.referenceLoad != null && observation.indicatedValue != null ? 1 : 0);
  }, 0);
}

export function getMissingSelectedProcedures(selectedAnnexes, observations) {
  const observedAnnexes = new Set((observations || []).map((observation) => observation.annexRef));
  return (selectedAnnexes || []).filter((annexRef) => !observedAnnexes.has(annexRef));
}

export function getSubmissionFocusAnnex(message, testTypes, preferredAnnexes = [], fallbackAnnex) {
  const text = typeof message === 'string' ? message : '';
  const annexMatch = text.match(/\b(?:A\d+_[a-z0-9_]+|B_[a-z0-9_]+)\b/i);
  if (annexMatch) return annexMatch[0];

  const lowerText = text.toLowerCase();
  const matchingTestType = (testTypes || [])
    .map((testType) => ({
      testType,
      index: testType.testName ? lowerText.indexOf(testType.testName.toLowerCase()) : -1,
    }))
    .filter(({ index }) => index >= 0)
    .sort((left, right) => left.index - right.index)[0]?.testType;
  return matchingTestType?.oimlAnnexRef || preferredAnnexes[0] || fallbackAnnex;
}

export function getMandatoryProcedureAnnexes(testTypes, accuracyClass, verificationStage) {
  return [...new Set((testTypes || [])
    .filter((testType) =>
      testType.status === 'approved' &&
      testType.isActive === true &&
      (testType.mandatoryFor || []).some((requirement) =>
        requirement.accuracyClass === accuracyClass &&
        ['all', verificationStage].includes(requirement.verificationStage)
      )
    )
    .map((testType) => testType.oimlAnnexRef)
    .filter(Boolean))];
}

const FALLBACK_READING_FIELDS = [
  { name: 'position', labelEn: 'Position' },
  { name: 'load', labelEn: 'Applied load' },
  { name: 'reference', labelEn: 'Reference load' },
  { name: 'indicated', labelEn: 'Indicated value' },
  { name: 'deltaL', labelEn: 'Delta L' },
  { name: 'condition', labelEn: 'Condition' },
  { name: 'timestamp', labelEn: 'Recorded at' },
];

export function getDisplayReadingFields(criterionFields, readings) {
  const safeFields = (criterionFields || []).filter((field) =>
    field.name && !['_id', 'id', '__v'].includes(field.name)
  );
  if (safeFields.length) return safeFields;

  return FALLBACK_READING_FIELDS.filter((field) =>
    (readings || []).some((reading) =>
      reading[field.name] !== undefined && reading[field.name] !== null && reading[field.name] !== ''
    )
  );
}

export function hasRequiredReadings(readings, fields, minimumRows) {
  return (readings || []).length >= minimumRows && (readings || []).every((reading) =>
    (fields || []).filter((field) => field.required).every((field) =>
      reading[field.name] !== undefined && reading[field.name] !== null && String(reading[field.name]).trim() !== ''
    )
  );
}

export function buildReadingPayload(readings, fields) {
  return (readings || []).map((reading) => {
    const payload = {};
    (fields || []).forEach((field) => {
      if (reading[field.name] !== undefined && reading[field.name] !== null && String(reading[field.name]).trim() !== '') {
        payload[field.name] = field.type === 'number' ? Number(reading[field.name]) : reading[field.name];
      }
    });
    return payload;
  });
}

export function getRuleFieldLabel(field, language) {
  return language === 'HI' && field?.labelHi ? field.labelHi : (field?.labelEn || field?.name || '-');
}