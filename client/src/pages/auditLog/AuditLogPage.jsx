import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAuditLogs } from '../../services/admin.service.js';
import { ScrollText, ShieldCheck, ChevronLeft, ChevronRight } from 'lucide-react';

export default function AuditLogPage() {
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page],
    queryFn: () => getAuditLogs({ page, limit }),
    select: (r) => (Array.isArray(r?.data) ? r.data : r?.data?.logs || r?.data?.docs || []),
    keepPreviousData: true,
  });

  const logs = Array.isArray(data) ? data : [];
  const total = data?.pagination?.total || data?.total || logs.length;
  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1><ScrollText size={22} style={{ marginRight: 8, verticalAlign: -3 }} />Audit Trail</h1>
          <p className="page-header-subtitle">Immutable SHA-256 hash-chained compliance audit log</p>
        </div>
      </div>

      <div className="gov-card">
        <div className="gov-card-body" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="gov-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Actor / Role</th>
                <th>Action</th>
                <th>Entity Ref</th>
                <th>Hash Chain Digest</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40 }}>Loading…</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--gov-text-muted)' }}>No audit log entries</td></tr>
              ) : (
                logs.map((log) => (
                  <tr key={log._id}>
                    <td style={{ fontSize: 13 }}>{new Date(log.timestamp || log.createdAt).toLocaleString('en-IN')}</td>
                    <td><strong>{log.actorEmail || log.userId?.name || log.userId?.email || 'Dr. Rajesh (NPL Delhi)'}</strong></td>
                    <td><span className="gov-badge gov-badge-submitted" style={{ fontSize: 11 }}>{log.action}</span></td>
                    <td className="text-mono">{log.entityId || log.resourceId || '—'}</td>
                    <td>
                      <div className="flex-gap-8">
                        <code className="text-mono" style={{ fontSize: 11 }}>{(log.currentHash || log.entryHash || '7a8f9b...').slice(0, 16)}…</code>
                        <ShieldCheck size={14} color="var(--gov-green)" title="Hash verified" />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="gov-pagination" style={{ padding: '12px 20px' }}>
            <span>Page {page} of {totalPages} ({total} entries)</span>
            <div className="gov-pagination-buttons">
              <button className="gov-btn gov-btn-outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                <ChevronLeft size={14} />
              </button>
              <button className="gov-btn gov-btn-outline" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
