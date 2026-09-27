import path from 'path';
import fs from 'fs';
import { Report } from '../models/Report.js';
import { TestSession } from '../models/TestSession.js';
import { InstrumentModel } from '../models/InstrumentModel.js';
import { Manufacturer } from '../models/Manufacturer.js';
import { User } from '../models/User.js';
import { generateReport } from '../services/reportGenerator.service.js';
import { appendAuditLog } from '../services/auditLogger.service.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listReports = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, status, labId, manufacturerId, accuracyClass, startDate, endDate } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  let query = {};
  if (status) query.status = status;

  if (startDate || endDate) {
    query.signedAt = {};
    if (startDate) query.signedAt.$gte = new Date(startDate);
    if (endDate) query.signedAt.$lte = new Date(endDate);
  }

  if (search) {
    query.$or = [
      { reportNumber: { $regex: search, $options: 'i' } },
      { contentHash: { $regex: search, $options: 'i' } },
      { documentHash: { $regex: search, $options: 'i' } },
    ];
  }

  // Handle session/model/manufacturer filters via pre-querying matching TestSession IDs
  if (labId || manufacturerId || accuracyClass) {
    const sessionQuery = {};
    if (labId) sessionQuery.labId = labId;
    if (accuracyClass) sessionQuery.accuracyClass = accuracyClass;

    if (manufacturerId) {
      const models = await InstrumentModel.find({ manufacturerId }).select('_id');
      sessionQuery.instrumentModelId = { $in: models.map((m) => m._id) };
    }

    const matchingSessions = await TestSession.find(sessionQuery).select('_id');
    query.testSessionId = { $in: matchingSessions.map((s) => s._id) };
  }

  const [reports, total] = await Promise.all([
    Report.find(query)
      .populate({
        path: 'testSessionId',
        populate: {
          path: 'instrumentModelId',
          populate: { path: 'manufacturerId' },
        },
      })
      .populate('signedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Report.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    data: {
      reports,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
      },
    },
  });
});

export const createReport = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const report = await generateReport({
    testSessionId: sessionId,
    userId: req.user.sub,
  });

  res.status(201).json({
    success: true,
    data: report,
  });
});

export const getReportById = asyncHandler(async (req, res) => {
  const report = await Report.findById(req.params.id)
    .populate({
      path: 'testSessionId',
      populate: {
        path: 'instrumentModelId',
        populate: { path: 'manufacturerId' },
      },
    })
    .populate('signedBy', 'name email role');

  if (!report) {
    throw new AppError(404, 'NOT_FOUND', 'Report not found');
  }

  if (
    (req.user.role === 'lab_technician' || req.user.role === 'lab_admin') &&
    req.user.labId &&
    report.testSessionId &&
    report.testSessionId.labId !== req.user.labId
  ) {
    throw new AppError(403, 'FORBIDDEN', 'Access denied to report belonging to another laboratory');
  }

  res.status(200).json({
    success: true,
    data: report,
  });
});

export const downloadReportFile = asyncHandler(async (req, res) => {
  const { id, format } = req.params; // format: 'pdf' or 'docx'
  let report = await Report.findById(id);

  if (!report) {
    throw new AppError(404, 'NOT_FOUND', 'Report not found');
  }

  let filePath = format === 'docx' ? report.docxPath : report.pdfPath;
  let absolutePath = path.join(process.cwd(), filePath);

  if (!fs.existsSync(absolutePath)) {
    // Generate fresh report file if not present on disk
    try {
      const generated = await generateReport({
        testSessionId: report.testSessionId,
        userId: req.user.sub,
      });
      filePath = format === 'docx' ? generated.docxPath : generated.pdfPath;
      absolutePath = path.join(process.cwd(), filePath);
    } catch (err) {
      console.error('Error auto-generating report file:', err);
    }
  }

  if (!fs.existsSync(absolutePath)) {
    throw new AppError(404, 'NOT_FOUND', `Report file (${format}) could not be generated on disk`);
  }

  res.download(absolutePath);
});

export const revokeReport = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  if (!reason || typeof reason !== 'string' || !reason.trim()) {
    throw new AppError(400, 'VALIDATION_ERROR', 'A valid revocation reason is required');
  }

  const report = await Report.findById(req.params.id);
  if (!report) {
    throw new AppError(404, 'NOT_FOUND', 'Report not found');
  }

  if (report.status === 'revoked') {
    throw new AppError(409, 'INVALID_STATE', 'Report is already revoked');
  }

  report.status = 'revoked';
  await report.save();

  await appendAuditLog({
    entityType: 'Report',
    entityId: report._id,
    action: `revoke: ${reason.trim()}`,
    userId: req.user.sub,
  });

  res.status(200).json({
    success: true,
    data: report,
  });
});
