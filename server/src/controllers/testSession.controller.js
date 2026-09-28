import { TestSession } from '../models/TestSession.js';
import { Observation } from '../models/Observation.js';
import { InstrumentModel } from '../models/InstrumentModel.js';
import { Laboratory } from '../models/Laboratory.js';
import { resolveRuleConfig } from '../services/ruleResolver.service.js';
import { evaluateObservation, evaluateSession } from '../services/complianceEngine.service.js';
import { detectObservationAnomalies } from '../services/anomalyDetector.service.js';
import { appendAuditLog } from '../services/auditLogger.service.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { assertSessionAccess, getManufacturerForUser, manufacturerModelIds } from '../utils/tenantAccess.js';

export const createTestSession = asyncHandler(async (req, res) => {
  const {
    instrumentModelId,
    serialNumber,
    testDate,
    verificationStage,
    environmentalConditions,
    selectedAnnexes,
  } = req.body;

  const isLabBoundUser = ['lab_technician', 'lab_admin'].includes(req.user.role);
  const labId = isLabBoundUser ? req.user.labId : req.body.labId;
  if (!labId) throw new AppError(400, 'VALIDATION_ERROR', 'A registered laboratory is required');
  const laboratory = await Laboratory.findOne({ labId, isActive: true });
  if (!laboratory) throw new AppError(422, 'INVALID_LABORATORY', 'The selected laboratory is not registered or is inactive');

  const model = await InstrumentModel.findById(instrumentModelId).populate('manufacturerId');
  if (!model || !model.manufacturerId) {
    throw new AppError(404, 'NOT_FOUND', 'Instrument model not found');
  }

  const session = await TestSession.create({
    instrumentModelId,
    manufacturerName: model.manufacturerId.name,
    modelName: model.modelName,
    serialNumber,
    accuracyClass: model.accuracyClass,
    maxCapacity: model.maxCapacity,
    minCapacity: model.minCapacity,
    scaleInterval: model.e,
    selectedAnnexes,
    labId,
    laboratoryRef: laboratory._id,
    laboratoryName: laboratory.labName,
    createdBy: req.user.sub,
    testDate,
    verificationStage: verificationStage || 'initial',
    status: 'draft',
    environmentalConditions,
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
  await assertSessionAccess(req, session);

  const rawObservations = Array.isArray(req.body.observations)
    ? req.body.observations
    : [req.body];
  const unselected = rawObservations.find((obs) => !(session.selectedAnnexes || []).includes(obs.annexRef));
  if (unselected) {
    throw new AppError(422, 'UNSELECTED_PROCEDURE', `${unselected.annexRef} was not selected for this test session`);
  }

  const docsToInsert = rawObservations.map((obs) => ({
    testSessionId: session._id,
    ...obs,
  }));

  const inserted = await Observation.insertMany(docsToInsert);

  for (const observation of inserted) {
    await appendAuditLog({ entityType: 'Observation', entityId: observation._id, action: 'create', userId: req.user.sub });
  }

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
  await assertSessionAccess(req, session);

  const observations = await Observation.find({ testSessionId: session._id });
  if (observations.length === 0) {
    throw new AppError(
      409,
      'INVALID_STATE',
      'Cannot submit a test session with zero observations'
    );
  }

  const selected = new Set(session.selectedAnnexes || []);
  const observed = new Set(observations.map((observation) => observation.annexRef));
  const missingAnnexes = [...selected].filter((annex) => !observed.has(annex));
  const unexpectedAnnexes = [...observed].filter((annex) => !selected.has(annex));
  if (missingAnnexes.length || unexpectedAnnexes.length) {
    throw new AppError(422, 'INCOMPLETE_TEST_COVERAGE', `Missing selected procedures: ${missingAnnexes.join(', ') || 'none'}; unselected procedures with observations: ${unexpectedAnnexes.join(', ') || 'none'}`);
  }

  let model = session.instrumentModelId;
  if (!model || !model.accuracyClass) {
    model = await InstrumentModel.findById(session.instrumentModelId);
  }
  const accuracyClass = session.accuracyClass || model?.accuracyClass;
  const maxCapacity = session.maxCapacity ?? model?.maxCapacity;
  const scaleInterval = session.scaleInterval ?? model?.e;
  if (!accuracyClass || !Number.isFinite(maxCapacity) || !Number.isFinite(scaleInterval) || scaleInterval <= 0) {
    throw new AppError(422, 'INVALID_INSTRUMENT_PARAMETERS', 'A complete registered instrument specification is required to evaluate this session');
  }

  const instrumentModel = {
    accuracyClass,
    maxCapacity,
    e: scaleInterval,
  };
  const ruleConfig = await resolveRuleConfig(accuracyClass, session.testDate);

  for (const obs of observations) {
    const evalResult = evaluateObservation(obs, instrumentModel, ruleConfig, session.verificationStage || 'initial');
    obs.outcome = evalResult.outcome;
    if (obs.evaluationMethod === 'mpe_band') {
      obs.computedError = evalResult.computedError;
      obs.appliedMpe = evalResult.appliedMpe;
      obs.marginToMpe = evalResult.marginToMpe;
      obs.errorRatioE = evalResult.errorRatioE;
      obs.ruleConfigId = evalResult.ruleConfigId;
    }
    await detectObservationAnomalies(obs, session);
    await obs.save();
    await appendAuditLog({ entityType: 'Observation', entityId: obs._id, action: `evaluate:${ruleConfig._id}:${evalResult.outcome}`, userId: req.user.sub });
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
  await assertSessionAccess(req, session);

  if (session.status !== 'under_review' || !['pass', 'fail'].includes(session.overallResult)) {
    throw new AppError(
      409,
      'INVALID_STATE',
      `Session status is '${session.status}' with result '${session.overallResult}'. Only evaluated sessions under review can be approved`
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
  await assertSessionAccess(req, session);

  if (session.status !== 'under_review' || !['pass', 'fail'].includes(session.overallResult)) {
    throw new AppError(
      409,
      'INVALID_STATE',
      `Session status is '${session.status}'. Only sessions in 'under_review' state can be rejected`
    );
  }

  const { reason, reviewerNotes } = req.body;
  const rejectionReason = reason || reviewerNotes;
  if (!rejectionReason || typeof rejectionReason !== 'string' || !rejectionReason.trim()) {
    throw new AppError(400, 'VALIDATION_ERROR', 'A non-empty rejection reason or reviewer note is required when rejecting a session');
  }

  session.status = 'draft';
  session.reviewerNotes = rejectionReason.trim();
  session.rejectedAt = new Date();
  await session.save();

  await appendAuditLog({
    entityType: 'TestSession',
    entityId: session._id,
    action: `reject: ${rejectionReason.trim()}`,
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
  if (['lab_technician', 'lab_admin', 'reviewer'].includes(req.user.role)) query.labId = req.user.labId || null;
  if (req.user.role === 'manufacturer') {
    const manufacturer = await getManufacturerForUser(req.user.sub);
    query.instrumentModelId = { $in: await manufacturerModelIds(manufacturer?._id) };
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

  await assertSessionAccess(req, session);

  const observations = await Observation.find({ testSessionId: session._id });

  res.status(200).json({
    success: true,
    data: {
      ...session.toObject(),
      observations,
    },
  });
});

export const updateObservation = asyncHandler(async (req, res) => {
  const observation = await Observation.findById(req.params.obsId);
  if (!observation) {
    throw new AppError(404, 'NOT_FOUND', 'Observation not found');
  }

  if (req.params.id && observation.testSessionId.toString() !== req.params.id) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Observation does not belong to the specified test session');
  }

  const session = await TestSession.findById(observation.testSessionId);
  if (!session) {
    throw new AppError(404, 'NOT_FOUND', 'Parent test session not found');
  }

  if (session.status !== 'draft') {
    throw new AppError(
      409,
      'SESSION_LOCKED',
      'Observations can only be edited while the session is in draft status'
    );
  }
  await assertSessionAccess(req, session);

  if (req.body.annexRef && !(session.selectedAnnexes || []).includes(req.body.annexRef)) {
    throw new AppError(422, 'UNSELECTED_PROCEDURE', `${req.body.annexRef} was not selected for this test session`);
  }

  // Only allow updating data fields, not computed fields
  const allowedFields = ['annexRef', 'evaluationMethod', 'referenceLoad', 'indicatedValue', 'zeroCorrection', 'checklistPassed', 'reviewerNotes'];
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      observation[field] = req.body[field];
    }
  }

  // Clear computed fields — they'll be recalculated on next submit
  observation.computedError = undefined;
  observation.appliedMpe = undefined;
  observation.marginToMpe = undefined;
  observation.errorRatioE = undefined;
  observation.ruleConfigId = undefined;
  observation.outcome = null;

  await observation.save();

  await appendAuditLog({
    entityType: 'Observation',
    entityId: observation._id,
    action: 'update',
    userId: req.user.sub,
  });

  res.status(200).json({
    success: true,
    data: observation,
  });
});

export const deleteObservation = asyncHandler(async (req, res) => {
  const observation = await Observation.findById(req.params.obsId);
  if (!observation) {
    throw new AppError(404, 'NOT_FOUND', 'Observation not found');
  }

  const session = await TestSession.findById(observation.testSessionId);
  if (!session) {
    throw new AppError(404, 'NOT_FOUND', 'Parent test session not found');
  }

  if (session.status !== 'draft') {
    throw new AppError(
      409,
      'SESSION_LOCKED',
      'Observations can only be deleted while the session is in draft status'
    );
  }
  await assertSessionAccess(req, session);

  await Observation.findByIdAndDelete(observation._id);

  await appendAuditLog({
    entityType: 'Observation',
    entityId: observation._id,
    action: 'delete',
    userId: req.user.sub,
  });

  res.status(200).json({
    success: true,
    message: 'Observation deleted successfully',
  });
});

const processedSyncClientIds = new Set();

export const batchSyncTestSessions = asyncHandler(async (req, res) => {
  const { batch } = req.body;
  if (!Array.isArray(batch)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Batch array is required');
  }

  const processed = [];
  const conflicts = [];

  for (const item of batch) {
    const { clientId, type, sessionId, obsId, data, updatedAt } = item;
    if (!clientId) continue;

    if (processedSyncClientIds.has(clientId)) {
      processed.push(clientId);
      continue;
    }

    try {
      if (type === 'ADD_OBSERVATION') {
        const session = await TestSession.findById(sessionId);
        if (!session) {
          conflicts.push({ clientId, reason: 'Test session not found' });
          continue;
        }
        await assertSessionAccess(req, session);

        if (session.status !== 'draft') {
          conflicts.push({ clientId, reason: 'Session is locked', currentStatus: session.status });
          continue;
        }

        const obsDoc = await Observation.create({
          testSessionId: session._id,
          ...data,
        });
        await appendAuditLog({ entityType: 'Observation', entityId: obsDoc._id, action: 'create:sync', userId: req.user.sub });
        processedSyncClientIds.add(clientId);
        processed.push(clientId);
      } else if (type === 'UPDATE_OBSERVATION') {
        const observation = await Observation.findById(obsId);
        if (!observation) {
          conflicts.push({ clientId, reason: 'Observation not found' });
          continue;
        }
        const session = await TestSession.findById(observation.testSessionId);
        if (!session || session.status !== 'draft') {
          conflicts.push({ clientId, reason: 'Session locked or not found' });
          continue;
        }
        await assertSessionAccess(req, session);

        if (updatedAt && observation.updatedAt && new Date(observation.updatedAt).getTime() > new Date(updatedAt).getTime()) {
          conflicts.push({ clientId, reason: 'Server observation has newer edits', serverUpdatedAt: observation.updatedAt });
          continue;
        }

        const allowedFields = ['annexRef', 'evaluationMethod', 'referenceLoad', 'indicatedValue', 'zeroCorrection', 'checklistPassed', 'reviewerNotes'];
        for (const field of allowedFields) {
          if (data && data[field] !== undefined) observation[field] = data[field];
        }
        await observation.save();
        await appendAuditLog({ entityType: 'Observation', entityId: observation._id, action: 'update:sync', userId: req.user.sub });
        processedSyncClientIds.add(clientId);
        processed.push(clientId);
      } else {
        conflicts.push({ clientId, reason: 'Unsupported sync action type' });
      }
    } catch (err) {
      conflicts.push({ clientId, reason: err.message });
    }
  }

  res.status(200).json({
    success: true,
    data: {
      processed,
      conflicts,
    },
  });
});

export const acknowledgeObservationFlag = asyncHandler(async (req, res) => {
  const observation = await Observation.findById(req.params.obsId);
  if (!observation) throw new AppError(404, 'NOT_FOUND', 'Observation not found');

  const session = await TestSession.findById(observation.testSessionId);
  if (!session) throw new AppError(404, 'NOT_FOUND', 'Test session not found');
  await assertSessionAccess(req, session);

  if (observation.advisoryFlags && observation.advisoryFlags.length > 0) {
    for (const flag of observation.advisoryFlags) {
      flag.acknowledged = true;
      flag.acknowledgedBy = req.user.sub;
      flag.acknowledgedAt = new Date();
    }
    await observation.save();
    await appendAuditLog({
      entityType: 'Observation',
      entityId: observation._id,
      action: 'acknowledge_advisory_flag',
      userId: req.user.sub,
    });
  }

  res.status(200).json({
    success: true,
    data: observation,
  });
});

