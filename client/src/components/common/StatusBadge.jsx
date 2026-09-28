import React from 'react';

export default function StatusBadge({ status }) {
  const s = (status || '').toLowerCase();
  const variant = s === 'integrity_tagged' ? 'info' : s;
  const label = s === 'integrity_tagged' ? 'Awaiting publication' : status;
  return <span className={`gov-badge gov-badge-${variant}`}>{label}</span>;
}
