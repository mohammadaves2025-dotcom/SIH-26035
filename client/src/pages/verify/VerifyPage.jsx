import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { verifyReport } from '../../services/report.service.js';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { ShieldCheck, Search, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function VerifyPage() {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(
    searchParams.get('hash') || searchParams.get('id') || searchParams.get('q') || ''
  );
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleVerify = async (qToUse) => {
    const target = qToUse || query;
    if (!target.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await verifyReport(target.trim());
      setResult(res.data || res);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Report not found or verification failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (query) {
      handleVerify(query);
    }
  }, []);

  return (
    <div style={{ maxWidth: 800 }}>
      <div className="page-header">
        <div>
          <h1><ShieldCheck size={22} style={{ marginRight: 8, verticalAlign: -3 }} />Public Verification Portal</h1>
          <p className="page-header-subtitle">Check a report record and the integrity of its stored PDF</p>
        </div>
      </div>

      {/* Search box */}
      <div className="gov-card mb-24">
        <div className="gov-card-body">
          <div className="gov-form-group">
            <label className="gov-label">Enter report number or SHA-256 PDF hash</label>
            <div className="flex-gap-8">
              <input
                className="gov-input"
                style={{ flex: 1 }}
                placeholder="e.g. REP-2024-0012 or 7f8a9b..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
              />
              <button className="gov-btn gov-btn-accent" onClick={() => handleVerify()} disabled={loading}>
                <Search size={16} /> {loading ? 'Verifying...' : 'Verify'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="gov-card mb-24" style={{ borderColor: 'var(--gov-red)' }}>
          <div className="gov-card-body flex-gap-8" style={{ color: 'var(--gov-red)' }}>
            <AlertCircle size={20} />
            <div>
              <strong>Verification Failed</strong>
              <p style={{ fontSize: 13, marginTop: 2 }}>{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Verification Result */}
      {result && (
        <div className="gov-card">
          <div className="gov-card-header" style={{ background: result.status === 'revoked' || !result.isIntegrityVerified ? 'var(--gov-red-light)' : 'var(--gov-green-light)' }}>
            <div className="flex-gap-8">
              <CheckCircle2 size={20} color={result.status === 'revoked' || !result.isIntegrityVerified ? 'var(--gov-red)' : 'var(--gov-green)'} />
              <h3 style={{ color: result.status === 'revoked' || !result.isIntegrityVerified ? 'var(--gov-red)' : 'var(--gov-green)' }}>
                {result.status === 'revoked' ? 'Report REVOKED' : result.isIntegrityVerified ? 'Report record and PDF integrity verified' : 'Report record found; PDF integrity not verified'}
              </h3>
            </div>
            <StatusBadge status={result.overallVerdict || result.status} />
          </div>

          <div className="gov-card-body">
            {result.isRevoked && (
              <div className="gov-card mb-16" style={{ background: 'var(--gov-red-light)', border: '1px solid var(--gov-red)', color: 'var(--gov-red)', padding: 12 }}>
                <strong>{result.revocationNotice || 'WARNING: This report has been REVOKED'}</strong>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: 14 }}>
              <div><span className="text-muted" style={{ fontSize: 12 }}>Report Number</span><br /><strong className="text-mono">{result.reportNumber || result._id}</strong></div>
              <div><span className="text-muted" style={{ fontSize: 12 }}>PDF integrity</span><br /><strong>{result.isIntegrityVerified ? 'Verified' : 'Could not verify stored PDF'}</strong></div>
              <div><span className="text-muted" style={{ fontSize: 12 }}>Accuracy Class</span><br /><strong>Class {result.accuracyClass || result.testSessionId?.accuracyClass || '—'}</strong></div>
              <div><span className="text-muted" style={{ fontSize: 12 }}>Serial Number</span><br /><strong className="text-mono">{result.serialNumber || result.testSessionId?.serialNumber || '—'}</strong></div>
              <div style={{ gridColumn: '1 / -1' }}>
                <span className="text-muted" style={{ fontSize: 12 }}>SHA-256 Document Hash</span><br />
                <code className="text-mono" style={{ fontSize: 12, wordBreak: 'break-all', background: 'var(--gov-bg-page)', padding: '6px 10px', borderRadius: 4, display: 'block', marginTop: 4 }}>
                  {result.contentHash || 'No stored PDF hash'}
                </code>
              </div>
              <p style={{ gridColumn: '1 / -1' }}>The stored HMAC is an integrity check and does not provide a PKI-based digital signature or independent legal signer verification.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
