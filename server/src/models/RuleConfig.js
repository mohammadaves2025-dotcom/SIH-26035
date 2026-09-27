import mongoose from 'mongoose';

const bandSchema = new mongoose.Schema(
  {
    uptoMultipleOfE: { type: Number, required: true },
    mpeFactor: { type: Number, required: true },
  },
  { _id: false }
);

const ruleConfigSchema = new mongoose.Schema(
  {
    oimlEdition: { type: String, required: true, trim: true },
    accuracyClass: {
      type: String,
      enum: ['I', 'II', 'III', 'IIII'],
      required: true,
    },
    effectiveDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['draft', 'active', 'archived'],
      default: 'active',
    },
    bands: { type: [bandSchema], required: true },
  },
  { timestamps: true }
);

ruleConfigSchema.index({ accuracyClass: 1, effectiveDate: -1 });

export const RuleConfig = mongoose.model('RuleConfig', ruleConfigSchema);
