import React from 'react';

export default function StatusBadge({ status }) {
  const s = (status || '').toLowerCase();
  return <span className={`gov-badge gov-badge-${s}`}>{status}</span>;
}
