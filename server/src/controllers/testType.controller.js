import { TestType } from '../models/TestType.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getTestTypes = asyncHandler(async (req, res) => {
  const types = await TestType.find().sort({ testTypeId: 1 });
  res.status(200).json({
    success: true,
    data: types,
  });
});
