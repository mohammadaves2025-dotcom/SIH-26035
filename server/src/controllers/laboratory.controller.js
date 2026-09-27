import { Laboratory } from '../models/Laboratory.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';

export const getLaboratories = asyncHandler(async (req, res) => {
  const labs = await Laboratory.find({ isActive: true }).sort({ name: 1 });
  res.status(200).json({
    success: true,
    data: labs,
  });
});

export const createLaboratory = asyncHandler(async (req, res) => {
  const { code, name, location, contactEmail, accreditationNumber } = req.body;
  const existing = await Laboratory.findOne({ code });
  if (existing) {
    throw new AppError(409, 'CONFLICT', 'Laboratory code already exists');
  }

  const lab = await Laboratory.create({
    code,
    name,
    location,
    contactEmail,
    accreditationNumber,
  });

  res.status(201).json({
    success: true,
    data: lab,
  });
});
