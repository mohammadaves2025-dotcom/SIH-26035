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

  const integrityFailed = !result?.isIntegrityVerified;
  const isCurrentPublished = result?.isPublished && !result?.isSuperseded;
  const resultColor = integrityFailed || result?.isRevoked || result?.isSuperseded
    ? 'var(--gov-red)'
    : isCurrentPublished ? 'var(--gov-green)' : 'var(--gov-orange)';

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
          <p className="page-header-subtitle">Check publication status and the integrity of the stored PDF</p>
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
                placeholder="e.g. NAWI-2026-000001 or 7f8a9b..."
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
          <div className="gov-card-header" style={{ background: resultColor === 'var(--gov-red)' ? 'var(--gov-red-light)' : resultColor === 'var(--gov-green)' ? 'var(--gov-green-light)' : 'var(--gov-orange-light, #fff4e5)' }}>
            <div className="flex-gap-8">
              <CheckCircle2 size={20} color={resultColor} />
              <h3 style={{ color: resultColor }}>
                {result.isRevoked ? 'Report REVOKED' : result.isSuperseded ? 'Report SUPERSEDED' : integrityFailed ? 'Report integrity could not be verified' : isCurrentPublished ? 'Published report verified' : 'Report is not currently published'}
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
            {result.isSuperseded && (
              <div className="gov-card mb-16" style={{ background: 'var(--gov-red-light)', border: '1px solid var(--gov-red)', color: 'var(--gov-red)', padding: 12 }}>
                This report has been superseded by {result.supersededByReportNumber || 'a newer report'} and should not be used as the current certificate.
              </div>
            )}
            {!result.isRevoked && !result.isSuperseded && !result.isPublished && (
              <div className="gov-card mb-16" style={{ background: 'var(--gov-orange-light, #fff4e5)', padding: 12 }}>
                Integrity verification alone does not make a report official. Current status: <strong>{result.status}</strong>.
              </div>
            )}
            {result.isPublished && !result.isSuperseded && (
              <div className="gov-card mb-16" style={{ background: 'var(--gov-green-light)', padding: 12 }}>
                Published {result.publishedAt ? `on ${new Date(result.publishedAt).toLocaleString()}` : ''}.
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, fontSize: 14 }}>
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
