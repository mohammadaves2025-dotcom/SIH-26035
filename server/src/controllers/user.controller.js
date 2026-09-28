import { User } from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';

export const getUsers = asyncHandler(async (req, res) => {
  const query = {};
  if (['lab_admin', 'reviewer'].includes(req.user.role)) {
    query.labId = req.user.labId || null;
  } else if (req.query.labId) {
    query.labId = req.query.labId;
  }

  if (req.query.role) {
    query.role = req.query.role;
  }

  const users = await User.find(query).select('-passwordHash').sort({ createdAt: -1 });
  res.status(200).json({
    success: true,
    data: users,
  });
});

export const updateUser = asyncHandler(async (req, res) => {
  const userToUpdate = await User.findById(req.params.id);
  if (!userToUpdate) {
    throw new AppError(404, 'NOT_FOUND', 'User not found');
  }

  if (req.user.role === 'lab_admin' && (!req.user.labId || userToUpdate.labId !== req.user.labId)) {
    throw new AppError(403, 'FORBIDDEN', 'Cannot manage users outside your assigned laboratory');
  }

  const { name, role, labId, active } = req.body;
  if (role && req.user.role !== 'admin') {
    throw new AppError(403, 'FORBIDDEN', 'Only a system administrator may change a user role');
  }
  if (name) userToUpdate.name = name;
  if (role) userToUpdate.role = role;
  if (labId && req.user.role === 'lab_admin' && labId !== req.user.labId) {
    throw new AppError(403, 'FORBIDDEN', 'A laboratory administrator cannot assign users to another laboratory');
  }
  if (labId) userToUpdate.labId = labId;
  if (active !== undefined) userToUpdate.active = Boolean(active);

  await userToUpdate.save();
  const result = userToUpdate.toObject();
  delete result.passwordHash;

  res.status(200).json({
    success: true,
    data: result,
  });
});

export const deleteUser = asyncHandler(async (req, res) => {
  const userToDelete = await User.findById(req.params.id);
  if (!userToDelete) {
    throw new AppError(404, 'NOT_FOUND', 'User not found');
  }

  if (req.user.role === 'lab_admin' && (!req.user.labId || userToDelete.labId !== req.user.labId)) {
    throw new AppError(403, 'FORBIDDEN', 'Cannot manage users outside your assigned laboratory');
  }

  if (!userToDelete.active) {
    throw new AppError(409, 'ALREADY_ARCHIVED', 'User is already archived');
  }

  // Soft-delete: set active=false to preserve audit trail references (§11.4)
  userToDelete.active = false;
  await userToDelete.save();

  res.status(200).json({
    success: true,
    message: 'User archived successfully',
  });
});
