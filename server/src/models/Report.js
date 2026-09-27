import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema(
  {
    testSessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TestSession',
      required: true,
    },
    revisionNumber: { type: Number, required: true, default: 1, min: 1 },
    supersedesReportId: { type: mongoose.Schema.Types.ObjectId, ref: 'Report', default: null },
    reportNumber: { type: String, required: true, unique: true },
    contentHash: { type: String, required: true },
    docxContentHash: { type: String, default: null },
    hmacTag: { type: String, required: true },
    docxHmacTag: { type: String, default: null },
    signatureAlgorithm: { type: String, default: 'HMAC-SHA256' },
    pdfPath: { type: String, required: true },
    docxPath: { type: String, required: true },
    status: {
      type: String,
      enum: ['integrity_tagged', 'revoked'],
      default: 'integrity_tagged',
    },
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    generatedAt: { type: Date, required: true },
  },
  { timestamps: true }
);

reportSchema.index({ testSessionId: 1, revisionNumber: 1 }, { unique: true });

export const Report = mongoose.model('Report', reportSchema);

const counterSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  seq: { type: Number, default: 0 },
});

export const Counter = mongoose.model('Counter', counterSchema);
