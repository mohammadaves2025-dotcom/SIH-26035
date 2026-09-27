import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { env } from '../config/env.js';

export async function registerUser({ name, email, password, role, labId }) {
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError(409, 'EMAIL_EXISTS', 'Email address is already registered');
  }

  const saltRounds = env.BCRYPT_SALT_ROUNDS || 10;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  const user = await User.create({
    name,
    email,
    passwordHash,
    role,
    labId: ['lab_technician', 'reviewer'].includes(role) ? labId : null,
  });

  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    labId: user.labId,
  };
}

export async function loginUser({ email, password }) {
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }
  if (!user.active) throw new AppError(401, 'ACCOUNT_DISABLED', 'This account is disabled');

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  const tokenPayload = {
    sub: user._id.toString(),
    role: user.role,
    labId: user.labId || null,
  };

  const token = jwt.sign(tokenPayload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });

  return {
    token,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      labId: user.labId,
    },
  };
}
