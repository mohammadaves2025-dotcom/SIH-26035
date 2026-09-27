import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { User } from '../models/User.js';

export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError(401, 'NO_TOKEN', 'Authorization token missing or malformed'));
  }

  const token = authHeader.split(' ')[1];
  let decoded;
  try {
    decoded = jwt.verify(token, env.JWT_SECRET);
  } catch (err) {
    return next(new AppError(401, 'INVALID_TOKEN', 'Invalid or expired token'));
  }
  User.findById(decoded.sub).select('active').then((user) => {
    if (!user || !user.active) return next(new AppError(401, 'ACCOUNT_DISABLED', 'Account is unavailable'));
    req.user = decoded;
    return next();
  }).catch(next);
}
