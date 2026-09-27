// API base URL (proxied through Vite in dev)
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const ACCURACY_CLASSES = ['I', 'II', 'III', 'IIII'];

export const SESSION_STATUSES = ['draft', 'submitted', 'passed', 'failed', 'published'];

export const ANNEX_REFS = [
  { value: 'A1_administrative',        label: 'A.1 — Administrative / Documentary Check',  method: 'manual_checklist' },
  { value: 'A2_construction',          label: 'A.2 — Construction Examination',             method: 'manual_checklist' },
  { value: 'A3_initial_examination',    label: 'A.3 — Initial Examination',                  method: 'manual_checklist' },
  { value: 'A4_discrimination',        label: 'A.4 — Discrimination Test',                  method: 'mpe_band' },
  { value: 'A4_repeatability',         label: 'A.4 — Repeatability Test',                   method: 'mpe_band' },
  { value: 'A4_eccentricity',          label: 'A.4 — Eccentricity Test',                    method: 'mpe_band' },
  { value: 'A4_accuracy',              label: 'A.4 — Accuracy / Performance Test',          method: 'mpe_band' },
  { value: 'A5_temperature',           label: 'A.5 — Temperature Influence Factor',         method: 'mpe_band' },
  { value: 'A5_humidity',              label: 'A.5 — Humidity Influence Factor',             method: 'mpe_band' },
  { value: 'A5_inclination',           label: 'A.5 — Inclination Influence Factor',          method: 'mpe_band' },
  { value: 'A6_endurance',             label: 'A.6 — Endurance Test',                       method: 'manual_checklist' },
  { value: 'B_electronic_additional',  label: 'Annex B — Electronic Additional Tests',      method: 'manual_checklist' },
];

export const CLASS_BOUNDS = {
  I:    { nMin: 50000, nMax: null   },
  II:   { nMin: 100,   nMax: 100000 },
  III:  { nMin: 100,   nMax: 10000  },
  IIII: { nMin: 100,   nMax: 1000   },
};
