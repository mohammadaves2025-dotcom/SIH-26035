import { InstrumentModel } from '../models/InstrumentModel.js';
import { User } from '../models/User.js';
import { Manufacturer } from '../models/Manufacturer.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const createInstrumentModel = asyncHandler(async (req, res) => {
  const { manufacturerId, modelName, accuracyClass, maxCapacity, e, minCapacity } = req.body;

  const manufacturer = await Manufacturer.findById(manufacturerId);
  if (!manufacturer) {
    throw new AppError(404, 'NOT_FOUND', 'Manufacturer not found');
  }

  const n = maxCapacity / e;

  const instrumentModel = await InstrumentModel.create({
    manufacturerId,
    modelName,
    accuracyClass,
    maxCapacity,
    e,
    minCapacity,
    n,
  });

  res.status(201).json({
    success: true,
    data: instrumentModel,
  });
});

export const getInstrumentModels = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page || '1', 10);
  const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
  const skip = (page - 1) * limit;

  const query = {};

  if (req.query.accuracyClass) {
    query.accuracyClass = req.query.accuracyClass;
  }
  if (req.query.manufacturerId) {
    query.manufacturerId = req.query.manufacturerId;
  }

  // If manufacturer user, auto-filter to their manufacturer
  if (req.user.role === 'manufacturer') {
    const user = await User.findById(req.user.sub);
    const mfg = await Manufacturer.findOne({ contactEmail: user?.email });
    if (mfg) {
      query.manufacturerId = mfg._id;
    } else {
      query.manufacturerId = null; // No matching manufacturer found
    }
  }

  const [models, total] = await Promise.all([
    InstrumentModel.find(query)
      .populate('manufacturerId', 'name contactEmail')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }),
    InstrumentModel.countDocuments(query),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  res.status(200).json({
    success: true,
    data: models,
    meta: {
      page,
      limit,
      total,
      totalPages,
    },
  });
});

export const getInstrumentModelById = asyncHandler(async (req, res) => {
  const model = await InstrumentModel.findById(req.params.id).populate('manufacturerId');
  if (!model) {
    throw new AppError(404, 'NOT_FOUND', 'Instrument model not found');
  }

  if (req.user.role === 'manufacturer') {
    const user = await User.findById(req.user.sub);
    const mfg = await Manufacturer.findOne({ contactEmail: user?.email });
    if (!mfg || model.manufacturerId._id.toString() !== mfg._id.toString()) {
      throw new AppError(403, 'FORBIDDEN', 'Cannot access models of another manufacturer');
    }
  }

  res.status(200).json({
    success: true,
    data: model,
  });
});
