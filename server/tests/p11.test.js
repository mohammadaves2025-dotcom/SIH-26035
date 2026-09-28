import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../src/app.js';
import { setupTestDB, teardownTestDB } from './testHelper.js';
import { User } from '../src/models/User.js';
import { Laboratory } from '../src/models/Laboratory.js';
import { Manufacturer } from '../src/models/Manufacturer.js';
import { InstrumentModel } from '../src/models/InstrumentModel.js';
import { TestSession } from '../src/models/TestSession.js';
import { Observation } from '../src/models/Observation.js';

describe('Phase P11 — Offline Batch Sync & Outbox Replay', () => {
  let adminToken;
  let sessionId;
  let modelId;
  let labId;

  beforeAll(async () => {
    await setupTestDB();
    const passwordHash = await bcrypt.hash('Password123!', 10);
    await User.deleteMany({ email: 'p11admin@test.com' });
    await User.create({
      name: 'P11 Admin',
      email: 'p11admin@test.com',
      passwordHash,
      role: 'admin',
    });

    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'p11admin@test.com',
      password: 'Password123!',
    });
    adminToken = loginRes.body.data.token;

    const lab = await Laboratory.create({
      labId: 'LAB-P11-01',
      labName: 'P11 Test Lab',
      accreditationNo: 'NABL-TC-9999',
      location: 'New Delhi',
      contactEmail: 'labp11@test.com',
    });

    const mfg = await Manufacturer.create({
      name: 'P11 Manufacturer',
      contactEmail: 'p11mfg@test.com',
    });

    const model = await InstrumentModel.create({
      manufacturerId: mfg._id,
      modelName: 'P11 Model Y',
      accuracyClass: 'III',
      maxCapacity: 50,
      e: 0.05,
      minCapacity: 0.5,
      n: 1000,
    });
    modelId = model._id.toString();
    labId = lab.labId;

    const session = await TestSession.create({
      instrumentModelId: model._id,
      manufacturerName: mfg.name,
      modelName: model.modelName,
      serialNumber: 'SN-P11-001',
      accuracyClass: 'III',
      maxCapacity: 50,
      minCapacity: 0.5,
      scaleInterval: 0.05,
      selectedAnnexes: ['A4_accuracy'],
      labId: lab.labId,
      laboratoryRef: lab._id,
      laboratoryName: lab.labName,
      createdBy: (await User.findOne({ email: 'p11admin@test.com' }))._id,
      testDate: new Date(),
      verificationStage: 'initial',
      status: 'draft',
      environmentalConditions: { temperatureC: 22, humidityPercent: 50, inclinationDeg: 0, notes: 'OK' },
    });
    sessionId = session._id.toString();
  }, 120000);

  afterAll(async () => {
    await teardownTestDB();
  });

  test('POST /api/test-sessions/sync/batch replays outbox batch idempotently', async () => {
    const clientId = 'client-uuid-' + Date.now();
    const batch = [
      {
        clientId,
        type: 'ADD_OBSERVATION',
        sessionId,
        data: {
          annexRef: 'A4_accuracy',
          evaluationMethod: 'mpe_band',
          referenceLoad: 10,
          indicatedValue: 10.01,
        },
      },
    ];

    // First replay
    const res1 = await request(app)
      .post('/api/test-sessions/sync/batch')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ batch });

    expect(res1.status).toBe(200);
    expect(res1.body.data.processed).toContain(clientId);

    // Duplicate replay (Idempotency test)
    const res2 = await request(app)
      .post('/api/test-sessions/sync/batch')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ batch });

    expect(res2.status).toBe(200);
    expect(res2.body.data.processed).toContain(clientId);
  });

  test('creates an offline session before replaying its queued observations and is idempotent', async () => {
    const sessionClientId = `offline-session-${Date.now()}`;
    const observationClientId = `offline-observation-${Date.now()}`;
    const batch = [
      {
        clientId: sessionClientId,
        type: 'CREATE_SESSION',
        data: {
          instrumentModelId: modelId,
          serialNumber: 'SN-OFFLINE-001',
          selectedAnnexes: ['A4_accuracy'],
          testDate: new Date().toISOString().slice(0, 10),
          verificationStage: 'initial',
          labId,
          environmentalConditions: { temperatureC: 22, humidityPercent: 50, inclinationDeg: 0, notes: 'Offline entry' },
        },
      },
      {
        clientId: observationClientId,
        type: 'ADD_OBSERVATION',
        sessionId: sessionClientId,
        data: { annexRef: 'A4_accuracy', evaluationMethod: 'mpe_band', referenceLoad: 10, indicatedValue: 10.01 },
      },
    ];

    const replay = () => request(app)
      .post('/api/test-sessions/sync/batch')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ batch });

    const first = await replay();
    expect(first.status).toBe(200);
    expect(first.body.data.conflicts).toHaveLength(0);
    const created = first.body.data.processed.find((item) => item.clientId === sessionClientId);
    expect(created.sessionId).toBeTruthy();
    expect(first.body.data.processed).toContain(observationClientId);
    expect(await TestSession.countDocuments({ clientSyncId: sessionClientId })).toBe(1);
    expect(await Observation.countDocuments({ testSessionId: created.sessionId, clientSyncId: observationClientId })).toBe(1);

    const second = await replay();
    expect(second.status).toBe(200);
    expect(second.body.data.conflicts).toHaveLength(0);
    expect(await TestSession.countDocuments({ clientSyncId: sessionClientId })).toBe(1);
    expect(await Observation.countDocuments({ testSessionId: created.sessionId, clientSyncId: observationClientId })).toBe(1);

    const savedObservation = await Observation.findOne({ testSessionId: created.sessionId, clientSyncId: observationClientId });
    const deleted = await request(app)
      .delete(`/api/test-sessions/${created.sessionId}/observations/${savedObservation._id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(deleted.status).toBe(200);
    const archivedObservation = await Observation.findById(savedObservation._id);
    expect(archivedObservation.deletedAt).toBeTruthy();
    expect(await Observation.countDocuments({ testSessionId: created.sessionId, deletedAt: null })).toBe(0);
    const integrity = await request(app)
      .get('/api/audit-log/integrity')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(integrity.status).toBe(200);
    expect(integrity.body.data.valid).toBe(true);
  });
});
