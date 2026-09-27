import { AuditLog } from '../models/AuditLog.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getAuditLogs = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page || '1', 10);
  const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
  const skip = (page - 1) * limit;

  const query = {};
  if (req.query.entityType) query.entityType = req.query.entityType;
  if (req.query.entityId) query.entityId = req.query.entityId;

  const [logs, total] = await Promise.all([
    AuditLog.find(query)
      .populate('userId', 'name email role')
      .skip(skip)
      .limit(limit)
      .sort({ timestamp: -1 }),
    AuditLog.countDocuments(query),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  res.status(200).json({
    success: true,
    data: logs,
    meta: {
      page,
      limit,
      total,
      totalPages,
    },
  });
});
