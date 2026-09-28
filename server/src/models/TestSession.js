import mongoose from 'mongoose';

const testSessionSchema = new mongoose.Schema(
  {
    instrumentModelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InstrumentModel',
      required: true,
    },
    manufacturerName: { type: String, trim: true, required: true },
    modelName: { type: String, trim: true, required: true },
    serialNumber: { type: String, trim: true, required: true },
    accuracyClass: { type: String, enum: ['I', 'II', 'III', 'IIII'], required: true },
    maxCapacity: { type: Number, required: true },
    minCapacity: { type: Number, required: true },
    scaleInterval: { type: Number, required: true },
    selectedAnnexes: { type: [String], required: true, validate: [(items) => items.length > 0, 'Select at least one test procedure'] },
    labId: { type: String, required: true, trim: true },
    laboratoryName: { type: String, required: true, trim: true },
    laboratoryRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Laboratory',
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    testDate: { type: Date, required: true },
    verificationStage: {
      type: String,
      enum: ['initial', 'subsequent'],
      default: 'initial',
    },
    status: {
      type: String,
      enum: ['draft', 'submitted', 'under_review', 'passed', 'failed', 'report_generated', 'published', 'revoked', 'archived'],
      default: 'draft',
    },
    overallResult: {
      type: String,
      enum: ['pass', 'fail', null],
      default: null,
    },
    environmentalConditions: {
      temperatureC: { type: Number, required: true },
      humidityPercent: { type: Number, required: true, min: 0, max: 100 },
      inclinationDeg: { type: Number, required: true },
      atmosphericPressurehPa: { type: Number },
      notes: { type: String, trim: true, required: true },
    },
  },
  { timestamps: true }
);

export const TestSession = mongoose.model('TestSession', testSessionSchema);
