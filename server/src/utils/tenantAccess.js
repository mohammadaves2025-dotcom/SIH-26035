import { InstrumentModel } from '../models/InstrumentModel.js';
import { Manufacturer } from '../models/Manufacturer.js';
import { User } from '../models/User.js';
import { AppError } from './AppError.js';

export async function getManufacturerForUser(userId) {
  const user = await User.findById(userId);
  if (!user) return null;
  if (user.manufacturerRef) {
    const mfg = await Manufacturer.findById(user.manufacturerRef);
    if (mfg) return mfg;
  }
  return Manufacturer.findOne({ contactEmail: user.email });
}

export async function manufacturerModelIds(manufacturerId) {
  if (!manufacturerId) return [];
  const models = await InstrumentModel.find({ manufacturerId }).select('_id');
  return models.map((model) => model._id);
}

// WP7 §11.1: Statuses visible to manufacturers — only post-evaluation sessions.
// Draft and under_review sessions are internal lab work and must never be disclosed.
const MANUFACTURER_VISIBLE_STATUSES = new Set([
  'passed', 'failed', 'report_generated', 'published', 'archived', 'revoked',
]);

export async function assertSessionAccess(req, session) {
  if (['lab_technician', 'lab_admin', 'reviewer'].includes(req.user.role)) {
    if (!req.user.labId || session.labId !== req.user.labId) {
      throw new AppError(403, 'FORBIDDEN', 'Access denied to a session outside your laboratory');
    }
  }
  if (req.user.role === 'manufacturer') {
    const manufacturer = await getManufacturerForUser(req.user.sub);
    const modelIds = await manufacturerModelIds(manufacturer?._id);
    const sessionModelId = session.instrumentModelId?._id || session.instrumentModelId;
    if (!modelIds.some((id) => id.toString() === sessionModelId?.toString())) {
      throw new AppError(403, 'FORBIDDEN', 'Access denied to a model outside your manufacturer account');
    }
    // Manufacturers must not see sessions that are still in draft or under active lab review.
    if (!MANUFACTURER_VISIBLE_STATUSES.has(session.status)) {
      throw new AppError(403, 'FORBIDDEN', 'This session is not yet available for viewing');
    }
  }
}

export async function assertReportAccess(req, report) {
  if (!report.testSessionId) return;
  // If the session is already populated
  if (report.testSessionId.labId) {
    return assertSessionAccess(req, report.testSessionId);
  }
  // Otherwise find the session
  const mongoose = await import('mongoose');
  const TestSession = mongoose.model('TestSession');
  const session = await TestSession.findById(report.testSessionId);
  if (session) {
    return assertSessionAccess(req, session);
  }
}

export async function sessionScopeForUser(user, requestedLabId) {
  const query = {};
  if (['lab_technician', 'lab_admin', 'reviewer'].includes(user.role)) {
    query.labId = user.labId || null;
  } else if (requestedLabId) {
    query.labId = requestedLabId;
  }
  if (user.role === 'manufacturer') {
    const manufacturer = await getManufacturerForUser(user.sub);
    query.instrumentModelId = { $in: await manufacturerModelIds(manufacturer?._id) };
    // Manufacturers only see sessions with an evaluation outcome, not active drafts/reviews.
    query.status = { $in: [...MANUFACTURER_VISIBLE_STATUSES] };
  }
  return query;
}
