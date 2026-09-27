import { Laboratory } from '../models/Laboratory.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { appendAuditLog } from '../services/auditLogger.service.js';

export const getLaboratories = asyncHandler(async (req, res) => {
  const labs = await Laboratory.find({ isActive: true }).sort({ labName: 1 });
  res.status(200).json({
    success: true,
    data: labs,
  });
});

export const createLaboratory = asyncHandler(async (req, res) => {
  const { code, name, location, contactEmail, accreditationNumber } = req.body;
  const existing = await Laboratory.findOne({ labId: code });
  if (existing) {
    throw new AppError(409, 'CONFLICT', 'Laboratory code already exists');
  }

  const lab = await Laboratory.create({
    labId: code,
    labName: name,
    location,
    contactEmail,
    accreditationNo: accreditationNumber,
  });
  await appendAuditLog({ entityType: 'Laboratory', entityId: lab._id, action: 'create', userId: req.user.sub });

  res.status(201).json({
    success: true,
    data: lab,
  });
});

export const updateLaboratory = asyncHandler(async (req, res) => {
  const lab = await Laboratory.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!lab) {
    throw new AppError(404, 'NOT_FOUND', 'Laboratory not found');
  }
  await appendAuditLog({ entityType: 'Laboratory', entityId: lab._id, action: 'update', userId: req.user.sub });
  res.status(200).json({ success: true, data: lab });
});

export const deleteLaboratory = asyncHandler(async (req, res) => {
  const lab = await Laboratory.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!lab) {
    throw new AppError(404, 'NOT_FOUND', 'Laboratory not found');
  }
  await appendAuditLog({ entityType: 'Laboratory', entityId: lab._id, action: 'deactivate', userId: req.user.sub });
  res.status(200).json({ success: true, message: 'Laboratory deactivated successfully' });
});
