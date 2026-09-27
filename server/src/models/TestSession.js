import mongoose from 'mongoose';

const testSessionSchema = new mongoose.Schema(
  {
    instrumentModelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InstrumentModel',
      required: true,
    },
    serialNumber: { type: String, trim: true, default: 'SN-2026-001' },
    accuracyClass: { type: String, enum: ['I', 'II', 'III', 'IIII'] },
    maxCapacity: { type: Number },
    minCapacity: { type: Number },
    scaleInterval: { type: Number },
    labId: { type: String, required: true, trim: true },
    laboratoryRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Laboratory',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    testDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['draft', 'submitted', 'under_review', 'passed', 'failed', 'published', 'revoked', 'archived'],
      default: 'draft',
    },
    overallResult: {
      type: String,
      enum: ['pass', 'fail', null],
      default: null,
    },
    environmentalConditions: {
      temperatureC: { type: Number, default: 22.5 },
      humidityPercent: { type: Number, default: 55 },
      inclinationDeg: { type: Number, default: 0.0 },
      notes: { type: String, default: 'Cleanroom climate controlled metrology chamber' },
    },
  },
  { timestamps: true }
);

export const TestSession = mongoose.model('TestSession', testSessionSchema);
