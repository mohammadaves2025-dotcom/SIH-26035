import React from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../services/apiClient.js';
import { FlaskConical, CheckCircle2, ShieldAlert } from 'lucide-react';

export default function TestTypesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['test-types-list'],
    queryFn: () => apiClient.get('/test-types'),
    select: (r) => r?.data?.data || r?.data || [],
  });

  const typesList = Array.isArray(data) ? data : [];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1><FlaskConical size={22} style={{ marginRight: 8, verticalAlign: -3 }} />OIML R-76 Test Procedures</h1>
          <p className="page-header-subtitle">Standard metrological evaluation procedures & influence factor tests</p>
        </div>
      </div>

      <div className="gov-card">
        <div className="gov-card-body" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="gov-table">
            <thead>
              <tr>
                <th>Procedure Code</th>
                <th>Test Title</th>
                <th>OIML Clause</th>
                <th>Evaluation Strategy</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: 40 }}>Loading…</td></tr>
              ) : typesList.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: 40, color: 'var(--gov-text-muted)' }}>No test procedures configured</td></tr>
              ) : (
                typesList.map((t) => (
                  <tr key={t._id}>
                    <td><strong className="text-mono">{t.code}</strong></td>
                    <td style={{ fontWeight: 600 }}>{t.name}</td>
                    <td><span className="gov-badge gov-badge-info">{t.oimlClause || 'A.4'}</span></td>
                    <td className="text-mono">{t.evaluationStrategy || 'MPE Band Evaluation'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
