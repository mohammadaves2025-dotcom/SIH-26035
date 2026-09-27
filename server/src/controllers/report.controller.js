import path from 'path';
import fs from 'fs';
import { Report } from '../models/Report.js';
import { TestSession } from '../models/TestSession.js';
import { InstrumentModel } from '../models/InstrumentModel.js';
import { generateReport } from '../services/reportGenerator.service.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { assertSessionAccess, getManufacturerForUser, manufacturerModelIds } from '../utils/tenantAccess.js';
import { sha256, verifySignature } from '../utils/hash.js';
import { appendAuditLog } from '../services/auditLogger.service.js';

export const listReports = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, status, labId, manufacturerId, accuracyClass, startDate, endDate } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  let query = {};
  if (status) query.status = status;

  if (startDate || endDate) {
    query.generatedAt = {};
    if (startDate) query.generatedAt.$gte = new Date(startDate);
    if (endDate) query.generatedAt.$lte = new Date(endDate);
  }

  if (search) {
    query.$or = [
      { reportNumber: { $regex: search, $options: 'i' } },
      { contentHash: { $regex: search, $options: 'i' } },
      { docxContentHash: { $regex: search, $options: 'i' } },
    ];
  }

  const sessionQuery = {};
  const labScoped = ['lab_technician', 'lab_admin', 'reviewer'].includes(req.user.role);
  if (labScoped) sessionQuery.labId = req.user.labId || null;
  else if (labId) sessionQuery.labId = labId;
  if (accuracyClass) sessionQuery.accuracyClass = accuracyClass;

  if (req.user.role === 'manufacturer') {
    const ownManufacturer = await getManufacturerForUser(req.user.sub);
    sessionQuery.instrumentModelId = { $in: await manufacturerModelIds(ownManufacturer?._id) };
  } else if (manufacturerId) {
    const models = await InstrumentModel.find({ manufacturerId }).select('_id');
    sessionQuery.instrumentModelId = { $in: models.map((model) => model._id) };
  }

  const matchingSessions = await TestSession.find(sessionQuery).select('_id');
  query.testSessionId = { $in: matchingSessions.map((session) => session._id) };

  const [reports, total] = await Promise.all([
    Report.find(query)
      .populate({
        path: 'testSessionId',
        populate: {
          path: 'instrumentModelId',
          populate: { path: 'manufacturerId' },
        },
      })
      .populate('generatedBy', 'name email')
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
  const session = await TestSession.findById(sessionId).populate('instrumentModelId');
  if (!session) throw new AppError(404, 'NOT_FOUND', 'Test session not found');
  await assertSessionAccess(req, session);
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
    .populate('generatedBy', 'name email role');

  if (!report) {
    throw new AppError(404, 'NOT_FOUND', 'Report not found');
  }
  await assertSessionAccess(req, report.testSessionId);

  res.status(200).json({
    success: true,
    data: report,
  });
});

export const downloadReportFile = asyncHandler(async (req, res) => {
  const { id, format } = req.params; // format: 'pdf' or 'docx'
  const report = await Report.findById(id).populate({ path: 'testSessionId', populate: { path: 'instrumentModelId' } });

  if (!report) {
    throw new AppError(404, 'NOT_FOUND', 'Report not found');
  }

  await assertSessionAccess(req, report.testSessionId);

  if (!['pdf', 'docx'].includes(format)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'format must be pdf or docx');
  }

  let filePath = format === 'docx' ? report.docxPath : report.pdfPath;
  let absolutePath = path.join(process.cwd(), filePath);

  if (!fs.existsSync(absolutePath)) {
    throw new AppError(404, 'NOT_FOUND', `Report file (${format}) could not be generated on disk`);
  }

  const fileHash = sha256(fs.readFileSync(absolutePath));
  const expectedHash = format === 'pdf' ? report.contentHash : report.docxContentHash;
  const expectedSignature = format === 'pdf' ? report.hmacTag : report.docxHmacTag;
  if (!expectedHash || fileHash !== expectedHash || !verifySignature(fileHash, expectedSignature)) {
    throw new AppError(409, 'REPORT_INTEGRITY_FAILED', 'Report integrity verification failed');
  }

  res.download(absolutePath);
});

export const revokeReport = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  if (!reason || typeof reason !== 'string' || !reason.trim()) {
    throw new AppError(400, 'VALIDATION_ERROR', 'A valid revocation reason is required');
  }

  const report = await Report.findById(req.params.id).populate('testSessionId');
  if (!report) {
    throw new AppError(404, 'NOT_FOUND', 'Report not found');
  }
  await assertSessionAccess(req, report.testSessionId);

  if (report.status === 'revoked') {
    throw new AppError(409, 'INVALID_STATE', 'Report is already revoked');
  }

  report.status = 'revoked';
  await report.save();

  const session = await TestSession.findById(report.testSessionId);
  if (session?.status === 'report_generated') {
    session.status = session.overallResult === 'pass' ? 'passed' : 'failed';
    await session.save();
  }

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
