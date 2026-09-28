import db from '../db/offlineDb.js';
import axios from 'axios';

/**
 * Offline Sync Service
 *
 * Manages the outbox queue for offline-created draft sessions and observations.
 * Replays queued mutations to the server batch sync endpoint when connectivity resumes.
 */

/**
 * Generate a client-side UUID for idempotent sync.
 */
export function generateClientId() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Save a draft session to IndexedDB and queue it in the outbox.
 */
export async function saveDraftSession(sessionData) {
  const clientId = generateClientId();
  const now = new Date().toISOString();

  const draft = {
    clientId,
    ...sessionData,
    status: 'draft',
    createdAt: now,
  };

  await db.draftSessions.add(draft);

  await db.outbox.add({
    clientId,
    type: 'CREATE_SESSION',
    sessionId: null,
    data: sessionData,
    status: 'pending',
    createdAt: now,
    retryCount: 0,
  });

  return { clientId, draft };
}

/**
 * Save a draft observation to IndexedDB and queue it in the outbox.
 */
export async function saveDraftObservation(sessionClientId, observationData) {
  const clientId = generateClientId();
  const now = new Date().toISOString();

  const draft = {
    clientId,
    sessionClientId,
    ...observationData,
    createdAt: now,
  };

  await db.draftObservations.add(draft);

  await db.outbox.add({
    clientId,
    type: 'ADD_OBSERVATION',
    sessionId: sessionClientId,
    data: observationData,
    status: 'pending',
    createdAt: now,
    retryCount: 0,
  });

  return { clientId, draft };
}

/**
 * Get all pending items from the outbox.
 */
export async function getPendingOutbox() {
  return db.outbox.where('status').equals('pending').sortBy('createdAt');
}

/**
 * Get all draft sessions.
 */
export async function getDraftSessions() {
  return db.draftSessions.toArray();
}

/**
 * Replay the entire outbox to the server in a single batch request.
 * Uses the POST /api/test-sessions/sync/batch endpoint.
 * Marks successfully processed items as 'synced'.
 */
export async function replayOutbox(token) {
  const pending = await getPendingOutbox();

  if (pending.length === 0) {
    return { synced: 0, failed: 0 };
  }

  const batch = pending.map((item) => ({
    clientId: item.clientId,
    type: item.type,
    sessionId: item.sessionId,
    data: item.data,
  }));

  try {
    const response = await axios.post(
      '/api/test-sessions/sync/batch',
      { batch },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const processed = new Set(response.data.data?.processed || []);
    let synced = 0;
    let failed = 0;

    for (const item of pending) {
      if (processed.has(item.clientId)) {
        await db.outbox.update(item.id, { status: 'synced' });
        synced++;
      } else {
        await db.outbox.update(item.id, {
          status: 'pending',
          retryCount: (item.retryCount || 0) + 1,
        });
        failed++;
      }
    }

    // Clean up synced draft sessions
    const syncedClientIds = [...processed];
    for (const cid of syncedClientIds) {
      await db.draftSessions.where('clientId').equals(cid).delete();
      await db.draftObservations.where('sessionClientId').equals(cid).delete();
    }

    return { synced, failed };
  } catch (error) {
    // Network error — leave items as pending for next retry
    console.warn('[OfflineSync] Replay failed, items remain in outbox:', error.message);
    return { synced: 0, failed: pending.length, error: error.message };
  }
}

/**
 * Cache instrument models for offline form population.
 */
export async function cacheInstrumentModels(models) {
  await db.cachedInstrumentModels.clear();
  const records = models.map((m) => ({
    id: m._id,
    modelName: m.modelName,
    accuracyClass: m.accuracyClass,
    maxCapacity: m.maxCapacity,
    e: m.e,
    minCapacity: m.minCapacity,
    n: m.n,
    manufacturerName: m.manufacturerName || m.manufacturerId?.name,
  }));
  await db.cachedInstrumentModels.bulkAdd(records);
}

/**
 * Cache active rule config summaries for offline form population.
 */
export async function cacheRuleConfigs(configs) {
  await db.cachedRuleConfigs.clear();
  const records = configs.map((c) => ({
    id: c._id,
    accuracyClass: c.accuracyClass,
    oimlEdition: c.oimlEdition,
    effectiveDate: c.effectiveDate,
    status: c.status,
    bands: c.bands,
  }));
  await db.cachedRuleConfigs.bulkAdd(records);
}

/**
 * Get cached instrument models from IndexedDB.
 */
export async function getCachedInstrumentModels() {
  return db.cachedInstrumentModels.toArray();
}

/**
 * Get cached rule configs from IndexedDB.
 */
export async function getCachedRuleConfigs() {
  return db.cachedRuleConfigs.toArray();
}

/**
 * Check if there are pending outbox items.
 */
export async function hasUnsyncedItems() {
  const count = await db.outbox.where('status').equals('pending').count();
  return count > 0;
}

/**
 * Clear all synced items from the outbox.
 */
export async function clearSyncedOutbox() {
  return db.outbox.where('status').equals('synced').delete();
}
