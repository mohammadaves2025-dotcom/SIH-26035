import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { revokeReport } from '../../services/report.service.js';
import apiClient from '../../services/apiClient.js';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { useNotificationStore } from '../../store/useNotificationStore.js';
import { useAuthStore } from '../../store/useAuthStore.js';
import { FileCheck, Download, AlertTriangle, ShieldCheck, Search } from 'lucide-react';

export default function ReportsPage() {
  const queryClient = useQueryClient();
  const addToast = useNotificationStore((s) => s.addToast);
  const role = useAuthStore((s) => s.user?.role);
  const canRevoke = ['admin', 'reviewer'].includes(role);
  const [revokeId, setRevokeId] = useState(null);
  const [reason, setReason] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['reports-list', searchTerm],
    queryFn: () => apiClient.get('/reports', { params: { search: searchTerm } }),
    select: (r) => r?.data?.reports || r?.data?.docs || [],
  });

  const revokeMut = useMutation({
    mutationFn: ({ id, reason }) => revokeReport(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries(['reports-list']);
      addToast({ type: 'success', message: 'Report revoked successfully' });
      setRevokeId(null);
      setReason('');
    },
  });

  const handleDownload = async (reportId, format = 'pdf') => {
    try {
      const token = useAuthStore.getState().token;
      const res = await fetch(`/api/reports/${reportId}/download/${format}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error?.message || `Download failed (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report_${reportId.slice(-8)}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      addToast({ type: 'error', message: err.message || 'Download failed' });
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1><FileCheck size={22} style={{ marginRight: 8, verticalAlign: -3 }} />Test Reports</h1>
          <p className="page-header-subtitle">Generated test reports for reviewed OIML R-76 evaluations</p>
          <p className="text-muted" style={{ fontSize: 12 }}>These files carry SHA-256 and server HMAC integrity tags. They are not PKI-signed approvals or certificates.</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="gov-card mb-16">
        <div className="gov-card-body" style={{ padding: '12px 16px' }}>
          <div className="flex-gap-8" style={{ alignItems: 'center' }}>
            <Search size={16} color="var(--gov-text-muted)" />
            <input
              className="gov-input"
              style={{ flex: 1, border: 'none', background: 'transparent' }}
              placeholder="Search by Report Number (e.g. NAWI-2026-000001) or Cryptographic SHA-256 Hash..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button className="gov-btn gov-btn-outline" style={{ padding: '2px 8px', fontSize: 12 }} onClick={() => setSearchTerm('')}>
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="gov-card">
        <div className="gov-card-body" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="gov-table">
            <thead>
              <tr>
                <th>Report Number</th>
                <th>Session ID</th>
                <th>Evaluation Verdict</th>
                <th>Report State</th>
                <th>Hash Digest</th>
                <th>Generated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40 }}>Loading…</td></tr>
              ) : (data || []).length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--gov-text-muted)' }}>No reports generated yet</td></tr>
              ) : (
                (data || []).map((rep) => (
                  <tr key={rep._id}>
                    <td><strong className="text-mono">{rep.reportNumber || rep._id?.slice(-8)}</strong></td>
                    <td className="text-mono">{rep.testSessionId?._id?.slice(-8) || rep.testSessionId || '—'}</td>
                    <td><StatusBadge status={rep.testSessionId?.overallResult || 'unknown'} /></td>
                    <td><StatusBadge status={rep.status} /></td>
                    <td><code className="text-mono" style={{ fontSize: 11 }}>{rep.contentHash ? `${rep.contentHash.slice(0, 12)}…` : '—'}</code></td>
                    <td>{rep.createdAt ? new Date(rep.createdAt).toLocaleDateString('en-IN') : '—'}</td>
                    <td>
                      <div className="flex-gap-8">
                        <button onClick={() => handleDownload(rep._id, 'pdf')} className="gov-btn gov-btn-outline" style={{ padding: '4px 8px', fontSize: 12 }}>
                          <Download size={12} /> PDF
                        </button>
                        <button onClick={() => handleDownload(rep._id, 'docx')} className="gov-btn gov-btn-outline" style={{ padding: '4px 8px', fontSize: 12 }}>
                          <Download size={12} /> DOCX
                        </button>
                        {canRevoke && rep.status !== 'revoked' && (
                          <button className="gov-btn gov-btn-danger" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => setRevokeId(rep._id)}>
                            <AlertTriangle size={12} /> Revoke
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Revoke Modal */}
      {revokeId && (
        <div className="modal-overlay" onClick={() => setRevokeId(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Revoke Test Report</h3>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: 12, fontSize: 14 }}>
                Are you sure you want to revoke report <strong className="text-mono">{revokeId.slice(-8)}</strong>? This operation is permanent and recorded in the audit trail.
              </p>
              <div className="gov-form-group">
                <label className="gov-label">Reason for Revocation</label>
                <textarea className="gov-input" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="State justification for revoking..." required />
              </div>
            </div>
            <div className="modal-footer">
              <button className="gov-btn gov-btn-outline" onClick={() => setRevokeId(null)}>Cancel</button>
              <button className="gov-btn gov-btn-danger" onClick={() => revokeMut.mutate({ id: revokeId, reason })} disabled={!reason.trim() || revokeMut.isPending}>
                {revokeMut.isPending ? 'Revoking...' : 'Confirm Revocation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
