import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema(
  {
    testSessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TestSession',
      required: true,
      unique: true,
    },
    reportNumber: { type: String, required: true, unique: true },
    contentHash: { type: String, required: true },
    pdfPath: { type: String, required: true },
    docxPath: { type: String, required: true },
    status: {
      type: String,
      enum: ['signed', 'revoked'],
      default: 'signed',
    },
    signedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    signedAt: { type: Date, required: true },
  },
  { timestamps: true }
);

export const Report = mongoose.model('Report', reportSchema);

const counterSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  seq: { type: Number, default: 0 },
});

export const Counter = mongoose.model('Counter', counterSchema);
