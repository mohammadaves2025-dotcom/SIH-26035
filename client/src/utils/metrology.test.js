import { describe, expect, it } from 'vitest';
import { buildReadingPayload, formatMetrologyValue, getRuleFieldLabel, hasRequiredReadings, minimumReadingCount } from './metrology.js';

describe('metrology helpers', () => {
  it('formats values with six decimal places, trimmed zeros, and signs', () => {
    expect(formatMetrologyValue(1.2, true)).toBe('+1.2');
    expect(formatMetrologyValue(-0.5, true)).toBe('-0.5');
    expect(formatMetrologyValue(null)).toBe('-');
  });

  it('requires two rows for repeatability and discrimination criteria', () => {
    expect(minimumReadingCount({ criterion: { type: 'range_le_mpe_factor' } })).toBe(2);
    expect(minimumReadingCount({ criterion: { type: 'change_ge_factor_of_e' } })).toBe(2);
    expect(hasRequiredReadings([{ load: 1 }], [{ name: 'load', required: true }], 2)).toBe(false);
  });

  it('omits empty optional fields from reading payloads', () => {
    expect(buildReadingPayload([{ load: '1', note: '' }], [{ name: 'load', type: 'number', required: true }, { name: 'note', type: 'string' }])).toEqual([{ load: 1 }]);
  });

  it('falls back to English when Hindi is unavailable', () => {
    expect(getRuleFieldLabel({ labelEn: 'Load' }, 'HI')).toBe('Load');
    expect(getRuleFieldLabel({ labelEn: 'भार', labelHi: 'भार' }, 'HI')).toBe('भार');
  });
});
