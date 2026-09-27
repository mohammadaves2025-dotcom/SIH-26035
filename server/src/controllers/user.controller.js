import { User } from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';

export const getUsers = asyncHandler(async (req, res) => {
  const query = {};
  if (req.user.role === 'lab_admin' && req.user.labId) {
    query.labId = req.user.labId;
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

  if (req.user.role === 'lab_admin' && req.user.labId && userToUpdate.labId !== req.user.labId) {
    throw new AppError(403, 'FORBIDDEN', 'Cannot manage users outside your assigned laboratory');
  }

  const { name, role, labId, active } = req.body;
  if (name) userToUpdate.name = name;
  if (role) userToUpdate.role = role;
  if (labId) userToUpdate.labId = labId;
  if (active !== undefined) userToUpdate.active = active;

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

  if (req.user.role === 'lab_admin' && req.user.labId && userToDelete.labId !== req.user.labId) {
    throw new AppError(403, 'FORBIDDEN', 'Cannot manage users outside your assigned laboratory');
  }

  await User.findByIdAndDelete(req.params.id);
  res.status(200).json({
    success: true,
    message: 'User removed successfully',
  });
});
