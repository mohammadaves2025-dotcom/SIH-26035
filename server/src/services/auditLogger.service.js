import { AuditLog } from '../models/AuditLog.js';
import { sha256 } from '../utils/hash.js';

async function writeAuditLog({ entityType, entityId, action, userId }) {
  const last = await AuditLog.findOne().sort({ timestamp: -1, _id: -1 });
  const prevHash = last ? last.currentHash : '0'.repeat(64);
  const timestamp = new Date();
  const payload = JSON.stringify({ entityType, entityId, action, userId, timestamp });
  const currentHash = sha256(prevHash + payload);

  return AuditLog.create({
    entityType,
    entityId,
    action,
    userId,
    timestamp,
    prevHash,
    currentHash,
  });
}

// Serialize appends inside this process so concurrent requests cannot fork the chain.
// A distributed deployment still needs a database-level append lock or transactional writer.
let appendQueue = Promise.resolve();

export function appendAuditLog(entry) {
  const pendingWrite = appendQueue.then(() => writeAuditLog(entry));
  appendQueue = pendingWrite.then(() => undefined, () => undefined);
  return pendingWrite;
}
