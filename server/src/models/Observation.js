import mongoose from 'mongoose';

export const ANNEX_REFS = [
  'A1_administrative',
  'A2_construction',
  'A3_initial_examination',
  'A4_discrimination',
  'A4_repeatability',
  'A4_eccentricity',
  'A4_accuracy',
  'A5_temperature',
  'A5_humidity',
  'A5_inclination',
  'A6_endurance',
  'B_electronic_additional',
];

const observationSchema = new mongoose.Schema(
  {
    testSessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TestSession',
      required: true,
    },
    annexRef: {
      type: String,
      enum: ANNEX_REFS,
      required: true,
    },
    evaluationMethod: {
      type: String,
      enum: ['mpe_band', 'manual_checklist'],
      required: true,
    },
    // mpe_band fields
    referenceLoad: { type: Number },
    indicatedValue: { type: Number },
    zeroCorrection: { type: Number, default: 0 },
    computedError: { type: Number },
    appliedMpe: { type: Number },
    marginToMpe: { type: Number },
    errorRatioE: { type: Number },
    ruleConfigId: { type: mongoose.Schema.Types.ObjectId, ref: 'RuleConfig' },

    // manual_checklist fields
    checklistPassed: { type: Boolean },
    reviewerNotes: { type: String },

    outcome: {
      type: String,
      enum: ['pass', 'fail', null],
      default: null,
    },
    advisoryFlags: [
      {
        flagType: { type: String, default: 'ANOMALY_ERROR_RATIO' },
        zScore: { type: Number },
        message: { type: String },
        acknowledged: { type: Boolean, default: false },
        acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        acknowledgedAt: { type: Date, default: null },
      },
    ],
  },
  { timestamps: true }
);

export const Observation = mongoose.model('Observation', observationSchema);
