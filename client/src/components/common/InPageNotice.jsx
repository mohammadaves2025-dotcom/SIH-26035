import React from 'react';
import { useNotificationStore } from '../../store/useNotificationStore.js';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  warn: AlertCircle,
  warning: AlertCircle,
};

export default function InPageNotice() {
  const { toasts, removeToast } = useNotificationStore();
  if (toasts.length === 0) return null;

  return (
    <div className="in-page-notices" aria-live="polite">
      {toasts.map((notice) => {
        const Icon = ICONS[notice.type] || Info;
        return (
          <div
            key={notice.id}
            className={`in-page-notice in-page-notice-${notice.type}`}
            role={notice.type === 'error' ? 'alert' : 'status'}
          >
            <Icon className="in-page-notice-icon" size={18} aria-hidden="true" />
            <div className="in-page-notice-content">
              {notice.code && <strong className="in-page-notice-code">{notice.code}</strong>}
              <span>{notice.message}</span>
            </div>
            <button
              type="button"
              className="in-page-notice-dismiss"
              onClick={() => removeToast(notice.id)}
              aria-label="Dismiss message"
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
