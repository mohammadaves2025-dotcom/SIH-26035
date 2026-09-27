import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRuleConfigs, createRuleConfig } from '../../services/ruleConfig.service.js';
import { useNotificationStore } from '../../store/useNotificationStore.js';
import { ACCURACY_CLASSES } from '../../config/constants.js';
import { BookOpen, Plus, X } from 'lucide-react';

export default function RuleConfigsPage() {
  const queryClient = useQueryClient();
  const addToast = useNotificationStore((s) => s.addToast);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    accuracyClass: 'III',
    oimlEdition: 'OIML R-76-1:2006',
    effectiveDate: new Date().toISOString().split('T')[0],
    bands: [
      { uptoMultipleOfE: 500, mpeFactor: 0.5 },
      { uptoMultipleOfE: 2000, mpeFactor: 1.0 },
      { uptoMultipleOfE: 10000, mpeFactor: 1.5 },
    ],
  });

  const { data, isLoading } = useQuery({
    queryKey: ['rule-configs'],
    queryFn: () => getRuleConfigs({ limit: 100 }),
    select: (r) => (Array.isArray(r?.data) ? r.data : r?.data?.rules || r?.data?.docs || []),
  });

  const createMut = useMutation({
    mutationFn: createRuleConfig,
    onSuccess: () => {
      queryClient.invalidateQueries(['rule-configs']);
      addToast({ type: 'success', message: 'OIML Rule configuration registered' });
      setShowModal(false);
    },
  });

  const handleCreate = () => {
    createMut.mutate({
      oimlEdition: form.oimlEdition,
      accuracyClass: form.accuracyClass,
      effectiveDate: new Date(form.effectiveDate),
      bands: form.bands,
    });
  };

  const updateBand = (index, field, value) => {
    setForm((f) => {
      const nextBands = [...f.bands];
      nextBands[index] = { ...nextBands[index], [field]: Number(value) };
      return { ...f, bands: nextBands };
    });
  };

  const rulesList = Array.isArray(data) ? data : [];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1><BookOpen size={22} style={{ marginRight: 8, verticalAlign: -3 }} />OIML Rule Configurations</h1>
          <p className="page-header-subtitle">Versioned metrological tolerance thresholds & MPE bands (FR-15)</p>
        </div>
        <button className="gov-btn gov-btn-accent" onClick={() => setShowModal(true)}>
          <Plus size={16} /> New Rule Version
        </button>
      </div>

      <div className="gov-card">
        <div className="gov-card-body" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="gov-table">
            <thead>
              <tr>
                <th>Accuracy Class</th>
                <th>OIML Edition</th>
                <th>Effective Date</th>
                <th>Tolerance Bands (upto m, MPE factor)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40 }}>Loading…</td></tr>
              ) : rulesList.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--gov-text-muted)' }}>No rule configurations defined</td></tr>
              ) : (
                rulesList.map((r) => (
                  <tr key={r._id}>
                    <td><strong className="text-mono">Class {r.accuracyClass}</strong></td>
                    <td>{r.oimlEdition || 'OIML R-76-1:2006'}</td>
                    <td className="text-mono">{r.effectiveDate ? new Date(r.effectiveDate).toLocaleDateString() : 'Active'}</td>
                    <td className="text-mono">
                      {(r.bands || []).map((b) => `≤${b.uptoMultipleOfE}e (${b.mpeFactor}x)`).join(' | ') || 'Standard OIML Bands'}
                    </td>
                    <td><span className="gov-badge gov-badge-passed">Active</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-content" style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <h3>Create OIML Rule Configuration Version</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="gov-form-group">
                  <label className="gov-label">Accuracy Class</label>
                  <select className="gov-select" value={form.accuracyClass} onChange={(e) => setForm((f) => ({ ...f, accuracyClass: e.target.value }))}>
                    {ACCURACY_CLASSES.map((c) => <option key={c} value={c}>Class {c}</option>)}
                  </select>
                </div>
                <div className="gov-form-group">
                  <label className="gov-label">OIML Edition Standard</label>
                  <input className="gov-input" value={form.oimlEdition} onChange={(e) => setForm((f) => ({ ...f, oimlEdition: e.target.value }))} />
                </div>
              </div>
              <div className="gov-form-group">
                <label className="gov-label">Effective Date</label>
                <input className="gov-input" type="date" value={form.effectiveDate} onChange={(e) => setForm((f) => ({ ...f, effectiveDate: e.target.value }))} />
              </div>

              <h4 style={{ marginTop: 16, marginBottom: 10 }}>MPE Tolerance Bands (n = m/e)</h4>
              {form.bands.map((band, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 8 }}>
                  <div className="gov-form-group">
                    <label className="gov-label" style={{ fontSize: 11 }}>Upto Multiple of e (m)</label>
                    <input className="gov-input" type="number" value={band.uptoMultipleOfE} onChange={(e) => updateBand(idx, 'uptoMultipleOfE', e.target.value)} />
                  </div>
                  <div className="gov-form-group">
                    <label className="gov-label" style={{ fontSize: 11 }}>MPE Multiplier Factor</label>
                    <input className="gov-input" type="number" step="0.1" value={band.mpeFactor} onChange={(e) => updateBand(idx, 'mpeFactor', e.target.value)} />
                  </div>
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <button className="gov-btn gov-btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="gov-btn gov-btn-primary" onClick={handleCreate} disabled={createMut.isPending}>
                {createMut.isPending ? 'Saving...' : 'Activate Rule Version'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
