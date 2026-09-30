export function formatMetrologyValue(value, signed = false) {
  if (value === undefined || value === null || value === '') return '-';
  const number = Number(value);
  if (!Number.isFinite(number)) return '-';
  const formatted = number.toFixed(6).replace(/\.?(0+)$/, '');
  return signed && number > 0 ? `+${formatted}` : formatted;
}

export function minimumReadingCount(criterion) {
  return ['range_le_mpe_factor', 'change_ge_factor_of_e'].includes(criterion?.criterion?.type) ? 2 : 1;
}

export function getMissingSelectedProcedures(selectedAnnexes, observations) {
  const observedAnnexes = new Set((observations || []).map((observation) => observation.annexRef));
  return (selectedAnnexes || []).filter((annexRef) => !observedAnnexes.has(annexRef));
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
