import React from 'react';
import { useNotificationStore } from '../../store/useNotificationStore.js';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export default function ToastContainer() {
  const { toasts, removeToast } = useNotificationStore();
  const icons = {
    success: CheckCircle2,
    error: AlertCircle,
    info: Info,
    warn: AlertCircle,
    warning: AlertCircle,
  };

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`} role={t.type === 'error' ? 'alert' : 'status'}>
          {React.createElement(icons[t.type] || Info, { className: 'toast-icon', size: 20, 'aria-hidden': true })}
          <div className="toast-content">
            {t.code && <strong className="toast-code">{t.code}</strong>}
            <span className="toast-message">{t.message}</span>
          </div>
          <button
            type="button"
            className="toast-dismiss"
            onClick={() => removeToast(t.id)}
            aria-label="Dismiss notification"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
