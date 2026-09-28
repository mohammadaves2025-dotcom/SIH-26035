import mongoose from 'mongoose';

const testTypeSchema = new mongoose.Schema(
  {
    testTypeId: { type: String, required: true, unique: true, trim: true },
    testName: { type: String, required: true, trim: true },
    oimlAnnexRef: { type: String, required: true, trim: true },
    formulaRef: { type: String, default: 'E = I - L' },
    description: { type: String, trim: true },
    mandatoryFor: [
      {
        accuracyClass: { type: String, enum: ['I', 'II', 'III', 'IIII'] },
        verificationStage: { type: String, enum: ['initial', 'subsequent', 'all'], default: 'all' },
      },
    ],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const TestType = mongoose.model('TestType', testTypeSchema);
