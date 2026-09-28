import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { activateRuleConfig, getRuleConfigs, createRuleConfig, sandboxRuleConfig } from '../../services/ruleConfig.service.js';
import { useNotificationStore } from '../../store/useNotificationStore.js';
import { useAuthStore } from '../../store/useAuthStore.js';
import { ACCURACY_CLASSES } from '../../config/constants.js';
import { BookOpen, Plus, X, Trash2 } from 'lucide-react';

export default function RuleConfigsPage() {
  const queryClient = useQueryClient();
  const addToast = useNotificationStore((s) => s.addToast);
  const user = useAuthStore((s) => s.user);
  const [showModal, setShowModal] = useState(false);
  const [reviewRule, setReviewRule] = useState(null);
  const [sandboxResult, setSandboxResult] = useState(null);
  const [reviewForm, setReviewForm] = useState({ sourceReference: '', validationNote: '' });
  const [form, setForm] = useState({
    accuracyClass: 'III',
    oimlEdition: '',
    effectiveDate: new Date().toISOString().split('T')[0],
    bands: [{ uptoMultipleOfE: '', mpeFactor: '' }],
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
      addToast({ type: 'success', message: 'Rule configuration saved as draft for expert review' });
      setShowModal(false);
    },
  });

  const activateMut = useMutation({
    mutationFn: ({ id, sourceReference, validationNote }) => activateRuleConfig(id, { sourceReference, validationNote }),
    onSuccess: () => {
      queryClient.invalidateQueries(['rule-configs']);
      addToast({ type: 'success', message: 'Rule configuration activated with expert review recorded' });
      setReviewRule(null);
      setSandboxResult(null);
      setReviewForm({ sourceReference: '', validationNote: '' });
    },
  });

  const sandboxMut = useMutation({
    mutationFn: sandboxRuleConfig,
    onSuccess: (response) => {
      setSandboxResult(response?.data?.data || response?.data || null);
      queryClient.invalidateQueries(['rule-configs']);
      addToast({ type: 'success', message: 'Historical regression comparison completed. Review all changed outcomes before activation.' });
    },
    onError: (error) => addToast({ type: 'error', message: error.response?.data?.error?.message || 'Could not run rule regression comparison' }),
  });

  const handleCreate = () => {
    createMut.mutate({
      oimlEdition: form.oimlEdition,
      accuracyClass: form.accuracyClass,
      effectiveDate: new Date(form.effectiveDate),
      bands: form.bands.map((band) => ({ uptoMultipleOfE: Number(band.uptoMultipleOfE), mpeFactor: Number(band.mpeFactor) })),
    });
  };

  const canSaveDraft = Boolean(form.oimlEdition.trim() && form.effectiveDate && form.bands.length && form.bands.every((band, index) => {
    const limit = Number(band.uptoMultipleOfE);
    const factor = Number(band.mpeFactor);
    return Number.isSafeInteger(limit) && limit > 0 && Number.isFinite(factor) && factor > 0 &&
      (index === 0 || limit > Number(form.bands[index - 1].uptoMultipleOfE));
  }));

  const updateBand = (index, field, value) => {
    setForm((f) => {
      const nextBands = [...f.bands];
      nextBands[index] = { ...nextBands[index], [field]: value };
      return { ...f, bands: nextBands };
    });
  };

  const rulesList = Array.isArray(data) ? data : [];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1><BookOpen size={22} style={{ marginRight: 8, verticalAlign: -3 }} />OIML Rule Configurations</h1>
          <p className="page-header-subtitle">Draft rule sets require a separate metrology expert review before they can be used.</p>
        </div>
        {user?.role === 'admin' && <button className="gov-btn gov-btn-accent" onClick={() => setShowModal(true)}>
          <Plus size={16} /> New Rule Draft
        </button>}
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
                <th>Status / source</th>
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
                    <td>
                      <span className={`gov-badge ${r.status === 'active' ? 'gov-badge-passed' : 'gov-badge-info'}`}>{r.status || 'draft'}</span>
                      {r.status === 'active' && <div style={{ fontSize: 11, marginTop: 4 }}>{r.sourceReference || 'Source not recorded'}{r.approvedAt ? ` · reviewed ${new Date(r.approvedAt).toLocaleDateString()}` : ''}</div>}
                      {r.sandboxedAt && <div style={{ fontSize: 11, marginTop: 4 }}>
                        Regression check: {r.sandboxSummary?.compared || 0} compared, {r.sandboxSummary?.changed || 0} changed, {r.sandboxSummary?.uncomparable || 0} unresolved
                      </div>}
                      {user?.role === 'metrology_expert' && r.status === 'draft' && r.createdBy && (
                        <button className="gov-btn gov-btn-outline" style={{ marginTop: 6 }} onClick={() => { setReviewRule(r); setSandboxResult(null); }}>
                          Open technical review
                        </button>
                      )}
                    </td>
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
                  <input className="gov-input" value={form.oimlEdition} onChange={(e) => setForm((f) => ({ ...f, oimlEdition: e.target.value }))} placeholder="Exact edition and amendment" required />
                </div>
              </div>
              <div className="gov-form-group">
                <label className="gov-label">Effective Date</label>
                <input className="gov-input" type="date" value={form.effectiveDate} onChange={(e) => setForm((f) => ({ ...f, effectiveDate: e.target.value }))} />
              </div>

              <h4 style={{ marginTop: 16, marginBottom: 10 }}>MPE tolerance bands</h4>
              <p>Enter values transcribed from the governing OIML edition and applicable Indian Gazette amendments. The form starts blank to prevent indicative examples being mistaken for approved rules. A saved draft does not affect compliance calculations.</p>
              {form.bands.map((band, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, marginBottom: 8, alignItems: 'end' }}>
                  <div className="gov-form-group">
                    <label className="gov-label" style={{ fontSize: 11 }}>Upper band limit (m/e)</label>
                    <input className="gov-input" aria-label={`Band ${idx + 1} upper limit in e`} type="number" min="1" step="1" value={band.uptoMultipleOfE} onChange={(e) => updateBand(idx, 'uptoMultipleOfE', e.target.value)} required />
                  </div>
                  <div className="gov-form-group">
                    <label className="gov-label" style={{ fontSize: 11 }}>MPE factor</label>
                    <input className="gov-input" aria-label={`Band ${idx + 1} MPE factor`} type="number" min="0" step="any" value={band.mpeFactor} onChange={(e) => updateBand(idx, 'mpeFactor', e.target.value)} required />
                  </div>
                  <button type="button" className="gov-btn gov-btn-outline" aria-label={`Remove band ${idx + 1}`} disabled={form.bands.length === 1} onClick={() => setForm((current) => ({ ...current, bands: current.bands.filter((_, bandIndex) => bandIndex !== idx) }))}><Trash2 size={15} /></button>
                </div>
              ))}
              <button type="button" className="gov-btn gov-btn-outline" onClick={() => setForm((current) => ({ ...current, bands: [...current.bands, { uptoMultipleOfE: '', mpeFactor: '' }] }))}><Plus size={14} /> Add band</button>
            </div>
            <div className="modal-footer">
              <button className="gov-btn gov-btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="gov-btn gov-btn-primary" onClick={handleCreate} disabled={!canSaveDraft || createMut.isPending}>
                {createMut.isPending ? 'Saving...' : 'Save rule draft'}
              </button>
            </div>
          </div>
        </div>
      )}

      {reviewRule && (
        <div className="modal-overlay" onClick={(event) => event.target === event.currentTarget && setReviewRule(null)}>
          <div className="modal-content" role="dialog" aria-modal="true" aria-labelledby="rule-review-title" style={{ maxWidth: 720 }}>
            <div className="modal-header">
              <div><h3 id="rule-review-title">Technical review and regression check</h3><p className="text-muted" style={{ marginTop: 4 }}>Class {reviewRule.accuracyClass} · {reviewRule.oimlEdition} · effective {new Date(reviewRule.effectiveDate).toLocaleDateString()}</p></div>
              <button onClick={() => setReviewRule(null)} aria-label="Close review" style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="gov-card mb-16"><div className="gov-card-body">
                <strong>Draft tolerance bands</strong>
                {(reviewRule.bands || []).map((band, index) => <div key={index} className="text-mono" style={{ marginTop: 4 }}>≤ {band.uptoMultipleOfE}e — {band.mpeFactor} × MPE</div>)}
                <p className="text-muted" style={{ marginTop: 10, fontSize: 12 }}>The comparison shows how this draft changes saved A4 accuracy outcomes from its effective date onward. It does not establish that the draft is legally correct.</p>
              </div></div>
              <button className="gov-btn gov-btn-outline mb-16" onClick={() => sandboxMut.mutate(reviewRule._id)} disabled={sandboxMut.isPending}>
                {sandboxMut.isPending ? 'Comparing historical observations…' : 'Run / refresh regression comparison'}
              </button>
              {sandboxResult && <div className="gov-card mb-16" role="status"><div className="gov-card-body">
                <strong>Comparison result</strong>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, margin: '10px 0' }}>
                  <span>{sandboxResult.compared} compared</span><span>{sandboxResult.unchanged} unchanged</span><span>{sandboxResult.changed} changed</span><span>{sandboxResult.uncomparable} unresolved</span>
                </div>
                {sandboxResult.changes?.filter((item) => item.previousOutcome || item.proposedOutcome || item.error).length > 0 && <div style={{ maxHeight: 150, overflowY: 'auto', fontSize: 12 }}>
                  {sandboxResult.changes.filter((item) => item.previousOutcome || item.proposedOutcome || item.error).map((item) => <div key={`${item.observationId}-${item.sessionId}`} style={{ padding: '5px 0', borderTop: '1px solid var(--gov-border-subtle)' }}>
                    {item.observationId}: {item.error || `${item.previousOutcome} → ${item.proposedOutcome}`}
                  </div>)}
                </div>}
                <code className="text-mono" style={{ display: 'block', marginTop: 8, fontSize: 10, overflowWrap: 'anywhere' }}>Result digest: {sandboxResult.resultHash}</code>
              </div></div>}
              <div className="gov-form-group"><label className="gov-label" htmlFor="rule-source-reference">Authoritative source reference</label><input id="rule-source-reference" className="gov-input" value={reviewForm.sourceReference} onChange={(event) => setReviewForm((formState) => ({ ...formState, sourceReference: event.target.value }))} placeholder="Gazette rule / amendment / OIML clause and edition" /></div>
              <div className="gov-form-group"><label className="gov-label" htmlFor="rule-validation-note">Technical review note</label><textarea id="rule-validation-note" className="gov-input" rows={4} value={reviewForm.validationNote} onChange={(event) => setReviewForm((formState) => ({ ...formState, validationNote: event.target.value }))} placeholder="Record the source clauses checked, known-answer cases, changed outcomes and rationale" /></div>
            </div>
            <div className="modal-footer">
              <button className="gov-btn gov-btn-outline" onClick={() => setReviewRule(null)}>Close</button>
              <button className="gov-btn gov-btn-primary" onClick={() => activateMut.mutate({ id: reviewRule._id, ...reviewForm })} disabled={!sandboxResult || sandboxResult.uncomparable > 0 || !reviewForm.sourceReference.trim() || !reviewForm.validationNote.trim() || activateMut.isPending}>
                {activateMut.isPending ? 'Activating…' : 'Approve and activate rule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
