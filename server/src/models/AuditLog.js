import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    entityType: { type: String, required: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
    action: { type: String, required: true },
    details: { type: mongoose.Schema.Types.Mixed, default: undefined },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    timestamp: { type: Date, default: Date.now },
    prevHash: { type: String, required: true },
    currentHash: { type: String, required: true },
  },
  { timestamps: true }
);

auditLogSchema.index({ timestamp: -1 });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
