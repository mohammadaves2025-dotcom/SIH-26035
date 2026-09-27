import { TestSession } from '../models/TestSession.js';
import { Observation } from '../models/Observation.js';
import { InstrumentModel } from '../models/InstrumentModel.js';
import { Manufacturer } from '../models/Manufacturer.js';
import { User } from '../models/User.js';
import { resolveRuleConfig } from '../services/ruleResolver.service.js';
import { evaluateObservation, evaluateSession } from '../services/complianceEngine.service.js';
import { appendAuditLog } from '../services/auditLogger.service.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const createTestSession = asyncHandler(async (req, res) => {
  const {
    instrumentModelId,
    serialNumber,
    accuracyClass,
    maxCapacity,
    minCapacity,
    scaleInterval,
    testDate,
    environmentalConditions,
  } = req.body;

  const labId = (req.user.role === 'admin' || req.user.role === 'reviewer') ? (req.body.labId || 'LAB-DELHI-01') : (req.user.labId || 'LAB-DELHI-01');

  const model = await InstrumentModel.findById(instrumentModelId);
  if (!model) {
    throw new AppError(404, 'NOT_FOUND', 'Instrument model not found');
  }

  const session = await TestSession.create({
    instrumentModelId,
    serialNumber: serialNumber || 'SN-2026-001',
    accuracyClass: accuracyClass || model.accuracyClass,
    maxCapacity: maxCapacity || model.maxCapacity,
    minCapacity: minCapacity || model.minCapacity,
    scaleInterval: scaleInterval || model.e,
    labId,
    createdBy: req.user.sub,
    testDate: testDate ? new Date(testDate) : new Date(),
    status: 'draft',
    environmentalConditions: environmentalConditions || {
      temperatureC: 22.5,
      humidityPercent: 55,
      inclinationDeg: 0.0,
      notes: 'Cleanroom climate controlled testing chamber',
    },
  });

  await appendAuditLog({
    entityType: 'TestSession',
    entityId: session._id,
    action: 'create',
    userId: req.user.sub,
  });

  res.status(201).json({
    success: true,
    data: session,
  });
});

export const addObservations = asyncHandler(async (req, res) => {
  const session = await TestSession.findById(req.params.id);
  if (!session) {
    throw new AppError(404, 'NOT_FOUND', 'Test session not found');
  }

  if (session.status !== 'draft') {
    throw new AppError(
      409,
      'SESSION_LOCKED',
      'Cannot add observations to a session that is already submitted or processed'
    );
  }

  const rawObservations = Array.isArray(req.body.observations)
    ? req.body.observations
    : [req.body];

  const docsToInsert = rawObservations.map((obs) => ({
    testSessionId: session._id,
    annexRef: obs.annexRef || 'A4_accuracy',
    evaluationMethod: obs.evaluationMethod || (obs.referenceLoad != null ? 'mpe_band' : 'manual_checklist'),
    referenceLoad: obs.referenceLoad != null ? obs.referenceLoad : obs.testPointLoad,
    indicatedValue: obs.indicatedValue != null ? obs.indicatedValue : (Array.isArray(obs.readings) ? obs.readings[0] : obs.readings),
    checklistPassed: obs.checklistPassed != null ? obs.checklistPassed : true,
    reviewerNotes: obs.reviewerNotes || 'Standard check passed',
  }));

  const inserted = await Observation.insertMany(docsToInsert);

  res.status(201).json({
    success: true,
    data: inserted,
  });
});

export const submitTestSession = asyncHandler(async (req, res) => {
  const session = await TestSession.findById(req.params.id).populate('instrumentModelId');
  if (!session) {
    throw new AppError(404, 'NOT_FOUND', 'Test session not found');
  }

  if (session.status !== 'draft') {
    throw new AppError(
      409,
      'INVALID_STATE',
      `Session status is '${session.status}'. Only 'draft' sessions can be submitted`
    );
  }

  const observations = await Observation.find({ testSessionId: session._id });
  if (observations.length === 0) {
    throw new AppError(
      409,
      'INVALID_STATE',
      'Cannot submit a test session with zero observations'
    );
  }

  const instrumentModel = session.instrumentModelId;
  const ruleConfig = await resolveRuleConfig(instrumentModel.accuracyClass, session.testDate);

  for (const obs of observations) {
    const evalResult = evaluateObservation(obs, instrumentModel, ruleConfig);
    obs.outcome = evalResult.outcome;
    if (obs.evaluationMethod === 'mpe_band') {
      obs.computedError = evalResult.computedError;
      obs.appliedMpe = evalResult.appliedMpe;
      obs.ruleConfigId = evalResult.ruleConfigId;
    }
    await obs.save();
  }

  const overall = evaluateSession(observations);

  session.status = 'under_review';
  session.overallResult = overall;
  await session.save();

  await appendAuditLog({
    entityType: 'TestSession',
    entityId: session._id,
    action: 'submit',
    userId: req.user.sub,
  });

  res.status(200).json({
    success: true,
    data: {
      session,
      observations,
    },
  });
});

export const approveTestSession = asyncHandler(async (req, res) => {
  const session = await TestSession.findById(req.params.id);
  if (!session) {
    throw new AppError(404, 'NOT_FOUND', 'Test session not found');
  }

  if (!['under_review', 'submitted', 'evaluated'].includes(session.status)) {
    throw new AppError(
      409,
      'INVALID_STATE',
      `Session status is '${session.status}'. Only sessions in 'under_review' state can be approved`
    );
  }

  session.status = session.overallResult === 'fail' ? 'failed' : 'passed';
  await session.save();

  await appendAuditLog({
    entityType: 'TestSession',
    entityId: session._id,
    action: 'approve',
    userId: req.user.sub,
  });

  res.status(200).json({
    success: true,
    message: 'Session review approved',
    data: session,
  });
});

export const rejectTestSession = asyncHandler(async (req, res) => {
  const session = await TestSession.findById(req.params.id);
  if (!session) {
    throw new AppError(404, 'NOT_FOUND', 'Test session not found');
  }

  if (!['under_review', 'submitted', 'evaluated'].includes(session.status)) {
    throw new AppError(
      409,
      'INVALID_STATE',
      `Session status is '${session.status}'. Only sessions in 'under_review' state can be rejected`
    );
  }

  session.status = 'draft';
  await session.save();

  await appendAuditLog({
    entityType: 'TestSession',
    entityId: session._id,
    action: 'reject',
    userId: req.user.sub,
  });

  res.status(200).json({
    success: true,
    message: 'Session rejected and returned to draft for re-evaluation',
    data: session,
  });
});

export const getTestSessions = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page || '1', 10);
  const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
  const skip = (page - 1) * limit;

  const query = {};

  if (req.query.status) query.status = req.query.status;
  if (req.query.labId) query.labId = req.query.labId;
  if (req.query.instrumentModelId) query.instrumentModelId = req.query.instrumentModelId;

  // Auto-filter by role for lab tech & manufacturer
  if (req.user.role === 'lab_technician' && req.user.labId) {
    query.labId = req.user.labId;
  } else if (req.user.role === 'manufacturer') {
    const user = await User.findById(req.user.sub);
    const mfg = await Manufacturer.findOne({ contactEmail: user?.email });
    if (mfg) {
      const models = await InstrumentModel.find({ manufacturerId: mfg._id }).select('_id');
      query.instrumentModelId = { $in: models.map((m) => m._id) };
    }
  }

  const [sessions, total] = await Promise.all([
    TestSession.find(query)
      .populate('instrumentModelId')
      .populate('createdBy', 'name email role')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }),
    TestSession.countDocuments(query),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  res.status(200).json({
    success: true,
    data: sessions,
    meta: {
      page,
      limit,
      total,
      totalPages,
    },
  });
});

export const getTestSessionById = asyncHandler(async (req, res) => {
  const session = await TestSession.findById(req.params.id)
    .populate('instrumentModelId')
    .populate('createdBy', 'name email role');

  if (!session) {
    throw new AppError(404, 'NOT_FOUND', 'Test session not found');
  }

  if (
    (req.user.role === 'lab_technician' || req.user.role === 'lab_admin') &&
    req.user.labId &&
    session.labId !== req.user.labId
  ) {
    throw new AppError(403, 'FORBIDDEN', 'Access denied to session belonging to another laboratory');
  }

  const observations = await Observation.find({ testSessionId: session._id });

  res.status(200).json({
    success: true,
    data: {
      ...session.toObject(),
      observations,
    },
  });
});
