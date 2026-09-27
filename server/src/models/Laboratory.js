import mongoose from 'mongoose';

const laboratorySchema = new mongoose.Schema(
  {
    labId: { type: String, required: true, unique: true, trim: true },
    labName: { type: String, required: true, trim: true },
    accreditationNo: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    contactEmail: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Laboratory = mongoose.model('Laboratory', laboratorySchema);
