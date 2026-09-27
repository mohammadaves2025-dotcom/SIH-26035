import { Manufacturer } from '../models/Manufacturer.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const createManufacturer = asyncHandler(async (req, res) => {
  const manufacturer = await Manufacturer.create(req.body);
  res.status(201).json({
    success: true,
    data: manufacturer,
  });
});

export const getManufacturers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page || '1', 10);
  const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
  const skip = (page - 1) * limit;

  const query = {};
  if (req.query.search) {
    query.name = { $regex: req.query.search, $options: 'i' };
  }

  const [manufacturers, total] = await Promise.all([
    Manufacturer.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }),
    Manufacturer.countDocuments(query),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  res.status(200).json({
    success: true,
    data: manufacturers,
    meta: {
      page,
      limit,
      total,
      totalPages,
    },
  });
});

export const updateManufacturer = asyncHandler(async (req, res) => {
  const manufacturer = await Manufacturer.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!manufacturer) {
    throw new AppError(404, 'NOT_FOUND', 'Manufacturer not found');
  }
  res.status(200).json({ success: true, data: manufacturer });
});

export const deleteManufacturer = asyncHandler(async (req, res) => {
  const manufacturer = await Manufacturer.findByIdAndDelete(req.params.id);
  if (!manufacturer) {
    throw new AppError(404, 'NOT_FOUND', 'Manufacturer not found');
  }
  res.status(200).json({ success: true, message: 'Manufacturer deleted successfully' });
});
