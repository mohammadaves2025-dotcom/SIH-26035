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
          <p className="page-header-subtitle">Verify the authenticity of any NAWI OIML R-76 test certificate</p>
        </div>
      </div>

      {/* Search box */}
      <div className="gov-card mb-24">
        <div className="gov-card-body">
          <div className="gov-form-group">
            <label className="gov-label">Enter Report Number or SHA-256 Document Hash</label>
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
          <div className="gov-card-header" style={{ background: result.status === 'revoked' ? 'var(--gov-red-light)' : 'var(--gov-green-light)' }}>
            <div className="flex-gap-8">
              <CheckCircle2 size={20} color={result.status === 'revoked' ? 'var(--gov-red)' : 'var(--gov-green)'} />
              <h3 style={{ color: result.status === 'revoked' ? 'var(--gov-red)' : 'var(--gov-green)' }}>
                {result.status === 'revoked' ? 'Certificate REVOKED' : 'Authentic Government Certificate'}
              </h3>
            </div>
            <StatusBadge status={result.overallVerdict || result.status} />
          </div>

          <div className="gov-card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: 14 }}>
              <div><span className="text-muted" style={{ fontSize: 12 }}>Report Number</span><br /><strong className="text-mono">{result.reportNumber || result._id}</strong></div>
              <div><span className="text-muted" style={{ fontSize: 12 }}>Issuer</span><br /><strong>Department of Consumer Affairs, GoI</strong></div>
              <div><span className="text-muted" style={{ fontSize: 12 }}>Accuracy Class</span><br /><strong>Class {result.accuracyClass || result.testSessionId?.accuracyClass || '—'}</strong></div>
              <div><span className="text-muted" style={{ fontSize: 12 }}>Serial Number</span><br /><strong className="text-mono">{result.serialNumber || result.testSessionId?.serialNumber || '—'}</strong></div>
              <div style={{ gridColumn: '1 / -1' }}>
                <span className="text-muted" style={{ fontSize: 12 }}>SHA-256 Document Hash</span><br />
                <code className="text-mono" style={{ fontSize: 12, wordBreak: 'break-all', background: 'var(--gov-bg-page)', padding: '6px 10px', borderRadius: 4, display: 'block', marginTop: 4 }}>
                  {result.documentHash || result.contentHash || result.hash || 'Verified cryptographic signature match'}
                </code>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
