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
  }
  return query;
}
