import apiClient from './apiClient.js';

const STORAGE_KEY = 'nawi_offline_queue';

export function getOfflineQueue() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function queueOfflineAction(action) {
  const queue = getOfflineQueue();
  queue.push({
    ...action,
    id: Date.now() + '-' + Math.random().toString(36).substr(2, 5),
    createdAt: new Date().toISOString(),
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

export async function processOfflineQueue(addToast) {
  const queue = getOfflineQueue();
  if (queue.length === 0) return 0;

  let successCount = 0;
  const remaining = [];

  for (const item of queue) {
    try {
      if (item.type === 'ADD_OBSERVATION') {
        await apiClient.post(`/test-sessions/${item.sessionId}/observations`, { observations: [item.data] });
        successCount++;
      } else if (item.type === 'UPDATE_OBSERVATION') {
        await apiClient.patch(`/test-sessions/${item.sessionId}/observations/${item.obsId}`, item.data);
        successCount++;
      } else {
        remaining.push(item);
      }
    } catch (err) {
      console.error('Failed to sync offline action:', item, err);
      remaining.push(item);
    }
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));

  if (successCount > 0 && addToast) {
    addToast({ type: 'success', message: `Synchronized ${successCount} offline observation(s) with server` });
  }

  return successCount;
}

export function initOfflineSync(addToast) {
  window.addEventListener('online', () => {
    processOfflineQueue(addToast);
  });
}
