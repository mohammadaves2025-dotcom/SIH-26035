import React from 'react';
import { useNotificationStore } from '../../store/useNotificationStore.js';
import { X } from 'lucide-react';

export default function ToastContainer() {
  const { toasts, removeToast } = useNotificationStore();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <div style={{ flex: 1 }}>
            {t.code && <strong style={{ marginRight: 8, fontSize: 12, opacity: 0.7 }}>{t.code}</strong>}
            {t.message}
          </div>
          <button onClick={() => removeToast(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
