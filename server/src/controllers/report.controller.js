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
  const { page = 1, limit = 20, search } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  let query = {};
  if (search) {
    query.$or = [
      { reportNumber: { $regex: search, $options: 'i' } },
      { contentHash: { $regex: search, $options: 'i' } },
      { documentHash: { $regex: search, $options: 'i' } },
    ];
  }

  const [reports, total] = await Promise.all([
    Report.find(query)
      .populate('testSessionId')
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
