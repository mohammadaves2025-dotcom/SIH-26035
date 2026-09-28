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
    sourceReference: { type: String, trim: true, default: null },
    validationNote: { type: String, trim: true, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approvedAt: { type: Date, default: null },
    sandboxedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    sandboxedAt: { type: Date, default: null },
    sandboxResultHash: { type: String, default: null },
    sandboxSummary: {
      compared: { type: Number, default: 0 },
      unchanged: { type: Number, default: 0 },
      changed: { type: Number, default: 0 },
      uncomparable: { type: Number, default: 0 },
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'archived'],
      default: 'draft',
    },
    subsequentMpeMultiplier: { type: Number, default: 2.0 },
    bands: { type: [bandSchema], required: true },
  },
  { timestamps: true }
);

ruleConfigSchema.index({ accuracyClass: 1, effectiveDate: -1 });
ruleConfigSchema.index(
  { accuracyClass: 1, effectiveDate: 1 },
  { unique: true, partialFilterExpression: { status: 'active' } }
);

export const RuleConfig = mongoose.model('RuleConfig', ruleConfigSchema);
