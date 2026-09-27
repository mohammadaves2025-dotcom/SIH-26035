import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTestSessionById, addObservations, submitSession, approveSession, rejectSession } from '../../services/testSession.service.js';
import { generateReport } from '../../services/report.service.js';
import { getAttachments, uploadAttachment } from '../../services/attachment.service.js';
import { useAuthStore } from '../../store/useAuthStore.js';
import { useNotificationStore } from '../../store/useNotificationStore.js';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { ArrowLeft, Plus, Send, FileCheck, Scale, Paperclip, Upload, CheckCircle2, ShieldCheck, XCircle } from 'lucide-react';

export default function TestSessionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const addToast = useNotificationStore((s) => s.addToast);

  const [obsForm, setObsForm] = useState({
    annexRef: 'A4_accuracy',
    referenceLoad: '',
    indicatedValue: '',
    evaluationMethod: 'mpe_band',
    readings: '',
  });
  const [showObsForm, setShowObsForm] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const { data: session, isLoading } = useQuery({
    queryKey: ['test-session', id],
    queryFn: () => getTestSessionById(id),
    select: (r) => r?.data || r,
  });

  const { data: attachmentsData } = useQuery({
    queryKey: ['test-session-attachments', id],
    queryFn: () => getAttachments(id),
    select: (r) => r?.data || r || [],
    enabled: !!id,
  });

  const addObsMutation = useMutation({
    mutationFn: (data) => addObservations(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['test-session', id]);
      addToast({ type: 'success', message: 'Metrological observation recorded successfully' });
      setShowObsForm(false);
      setObsForm({ annexRef: 'A4_accuracy', referenceLoad: '', indicatedValue: '', evaluationMethod: 'mpe_band', readings: '' });
    },
  });

  const submitMutation = useMutation({
    mutationFn: () => submitSession(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['test-session', id]);
      addToast({ type: 'success', message: 'Session submitted for metrological review' });
    },
  });

  const approveMutation = useMutation({
    mutationFn: () => approveSession(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['test-session', id]);
      addToast({ type: 'success', message: 'Session review approved' });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () => rejectSession(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['test-session', id]);
      addToast({ type: 'warning', message: 'Session returned to draft for re-evaluation' });
    },
  });

  const reportMutation = useMutation({
    mutationFn: () => generateReport(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['test-session', id]);
      queryClient.invalidateQueries(['reports']);
      addToast({ type: 'success', message: 'Report & Digital Signature generated' });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: (formData) => uploadAttachment(id, formData),
    onSuccess: () => {
      queryClient.invalidateQueries(['test-session-attachments', id]);
      addToast({ type: 'success', message: 'Attachment uploaded successfully' });
      setSelectedFile(null);
    },
  });

  if (isLoading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading session data…</div>;
  if (!session) return <div style={{ padding: 40, textAlign: 'center' }}>Test Session not found</div>;

  const observations = session.observations || [];
  const results = session.results || session.evaluationResults || [];
  const attachments = Array.isArray(attachmentsData) ? attachmentsData : [];
  const userRole = user?.role || 'admin';
  const isReviewerOrAdmin = ['admin', 'reviewer', 'lab_admin', 'doca_officer'].includes(userRole);

  const handleAddObs = () => {
    const refLoad = Number(obsForm.referenceLoad);
    const indVal = Number(obsForm.indicatedValue || obsForm.referenceLoad);
    const parsedReadings = obsForm.readings
      ? obsForm.readings.split(',').map((r) => parseFloat(r.trim())).filter((r) => !isNaN(r))
      : [indVal];

    addObsMutation.mutate({
      annexRef: obsForm.annexRef,
      evaluationMethod: obsForm.evaluationMethod,
      referenceLoad: refLoad,
      indicatedValue: indVal,
      testPointLoad: refLoad,
      readings: parsedReadings,
    });
  };

  const handleFileUpload = (e) => {
    e.preventDefault();
    if (!selectedFile) return;
    const formData = new FormData();
    formData.append('file', selectedFile);
    uploadMutation.mutate(formData);
  };

  return (
    <div style={{ maxWidth: 960 }}>
      <button className="gov-btn gov-btn-outline mb-16" onClick={() => navigate('/test-sessions')}>
        <ArrowLeft size={14} /> Back to Test Sessions
      </button>

      {/* Session Metadata Header */}
      <div className="gov-card mb-24">
        <div className="gov-card-header">
          <div className="flex-gap-8">
            <Scale size={18} />
            <h3>Session ID: <span className="text-mono">{session._id}</span></h3>
          </div>
          <StatusBadge status={session.status} />
        </div>
        <div className="gov-card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, fontSize: 14 }}>
            <div><span className="text-muted" style={{ fontSize: 12 }}>Instrument Model</span><br /><strong>{session.instrumentModelId?.modelName || 'Standard Scale'}</strong></div>
            <div><span className="text-muted" style={{ fontSize: 12 }}>Serial Number</span><br /><strong className="text-mono">{session.serialNumber || 'SN-2026-001'}</strong></div>
            <div><span className="text-muted" style={{ fontSize: 12 }}>Accuracy Class</span><br /><strong>Class {session.accuracyClass || 'III'}</strong></div>
            <div><span className="text-muted" style={{ fontSize: 12 }}>Max Capacity (Max)</span><br /><strong>{session.maxCapacity || 30000} g</strong></div>
            <div><span className="text-muted" style={{ fontSize: 12 }}>Min Capacity (Min)</span><br /><strong>{session.minCapacity || 200} g</strong></div>
            <div><span className="text-muted" style={{ fontSize: 12 }}>Scale Interval (e)</span><br /><strong>{session.scaleInterval || 10} g</strong></div>
            <div><span className="text-muted" style={{ fontSize: 12 }}>Laboratory ID</span><br /><strong className="text-mono">{session.labId || 'LAB-DELHI-01'}</strong></div>
            <div><span className="text-muted" style={{ fontSize: 12 }}>Ambient Conditions</span><br /><strong>{session.environmentalConditions?.temperatureC || 23}°C | {session.environmentalConditions?.humidityPercent || 55}% RH</strong></div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex-gap-8 mb-24" style={{ flexWrap: 'wrap' }}>
        {session.status === 'draft' && (
          <>
            <button className="gov-btn gov-btn-primary" onClick={() => setShowObsForm(!showObsForm)}>
              <Plus size={14} /> Add Observation
            </button>
            <button className="gov-btn gov-btn-accent" onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending || observations.length === 0}>
              <Send size={14} /> {submitMutation.isPending ? 'Evaluating...' : 'Submit for Evaluation'}
            </button>
          </>
        )}
        {(session.status === 'passed' || session.status === 'failed' || session.status === 'submitted' || session.status === 'evaluated') && (
          <button className="gov-btn gov-btn-primary" onClick={() => reportMutation.mutate()} disabled={reportMutation.isPending}>
            <FileCheck size={14} /> {reportMutation.isPending ? 'Generating Certificate...' : 'Generate OIML Certificate & Sign'}
          </button>
        )}
      </div>

      {/* Observation Form Modal/Panel */}
      {showObsForm && (
        <div className="gov-card mb-24" style={{ border: '2px solid var(--gov-blue-primary)' }}>
          <div className="gov-card-header"><h4>Record Metrological Observation (OIML R-76 Annex A)</h4></div>
          <div className="gov-card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="gov-form-group">
                <label className="gov-label">Annex Test Procedure</label>
                <select className="gov-select" value={obsForm.annexRef} onChange={(e) => setObsForm((f) => ({ ...f, annexRef: e.target.value }))}>
                  <option value="A4_accuracy">A.4.4 — Weighing Performance / Accuracy</option>
                  <option value="A4_repeatability">A.4.10 — Repeatability Test</option>
                  <option value="A4_eccentricity">A.4.7 — Eccentricity Test (Off-Center)</option>
                  <option value="A4_discrimination">A.4.8 — Discrimination Test</option>
                  <option value="A4_tare">A.4.6 — Tare Balancing Test</option>
                  <option value="B_environmental">Annex B — Influence Factor (Temp/Tilt)</option>
                </select>
              </div>
              <div className="gov-form-group">
                <label className="gov-label">Evaluation Method</label>
                <select className="gov-select" value={obsForm.evaluationMethod} onChange={(e) => setObsForm((f) => ({ ...f, evaluationMethod: e.target.value }))}>
                  <option value="mpe_band">MPE Tolerance Band Check</option>
                  <option value="manual_checklist">Manual Metrological Checklist</option>
                </select>
              </div>
              <div className="gov-form-group">
                <label className="gov-label">Reference Load (L in grams)</label>
                <input className="gov-input" type="number" step="0.1" placeholder="e.g. 500.0" value={obsForm.referenceLoad} onChange={(e) => setObsForm((f) => ({ ...f, referenceLoad: e.target.value, indicatedValue: e.target.value }))} />
              </div>
              <div className="gov-form-group">
                <label className="gov-label">Indicated Reading (I in grams)</label>
                <input className="gov-input" type="number" step="0.1" placeholder="e.g. 500.2" value={obsForm.indicatedValue} onChange={(e) => setObsForm((f) => ({ ...f, indicatedValue: e.target.value }))} />
              </div>
            </div>
            <div className="gov-form-group">
              <label className="gov-label">Repeatability Readings (comma-separated, grams)</label>
              <input className="gov-input" placeholder="e.g. 500.0, 500.1, 500.0, 499.9, 500.0" value={obsForm.readings} onChange={(e) => setObsForm((f) => ({ ...f, readings: e.target.value }))} />
            </div>
            <div className="flex-gap-8">
              <button className="gov-btn gov-btn-primary" onClick={handleAddObs} disabled={addObsMutation.isPending || !obsForm.referenceLoad}>
                {addObsMutation.isPending ? 'Saving...' : 'Save Observation'}
              </button>
              <button className="gov-btn gov-btn-outline" onClick={() => setShowObsForm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Observations Table */}
      <div className="gov-card mb-24">
        <div className="gov-card-header">
          <h4>Test Observations ({observations.length})</h4>
        </div>
        <div className="gov-card-body" style={{ padding: 0, overflowX: 'auto' }}>
          {observations.length === 0 ? (
            <p style={{ padding: 20, textAlign: 'center', color: 'var(--gov-text-muted)' }}>No test observations recorded yet.</p>
          ) : (
            <table className="gov-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Annex Ref</th>
                  <th>Reference Load L (g)</th>
                  <th>Indicated Reading I (g)</th>
                  <th>Error E (g)</th>
                  <th>Readings</th>
                </tr>
              </thead>
              <tbody>
                {observations.map((obs, i) => {
                  const refL = obs.referenceLoad ?? obs.testPointLoad ?? '—';
                  const indI = obs.indicatedValue ?? (Array.isArray(obs.readings) ? obs.readings[0] : '—');
                  const errorE = (typeof indI === 'number' && typeof refL === 'number') ? (indI - refL).toFixed(2) : '—';
                  return (
                    <tr key={obs._id || i}>
                      <td>{i + 1}</td>
                      <td><span className="gov-badge gov-badge-info">{obs.annexRef}</span></td>
                      <td className="text-mono">{refL}</td>
                      <td className="text-mono">{indI}</td>
                      <td className="text-mono">{errorE}</td>
                      <td className="text-mono">{(obs.readings || []).join(', ')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Metrological Compliance Results */}
      {results.length > 0 && (
        <div className="gov-card mb-24">
          <div className="gov-card-header">
            <h4>Evaluation Results & MPE Limits</h4>
          </div>
          <div className="gov-card-body" style={{ padding: 0, overflowX: 'auto' }}>
            <table className="gov-table">
              <thead>
                <tr>
                  <th>Annex</th>
                  <th>Verdict</th>
                  <th>Error E (e)</th>
                  <th>Max Permissible Error MPE (±e)</th>
                  <th>Evaluated At</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => {
                  const errVal = r.computedError ?? r.error;
                  const mpeVal = r.appliedMpe ?? r.mpe;
                  const verdict = (r.outcome ?? r.verdict) || 'passed';
                  return (
                    <tr key={i}>
                      <td><strong>{r.annexRef}</strong></td>
                      <td><StatusBadge status={verdict} /></td>
                      <td className="text-mono">{errVal != null ? (Number(errVal) > 0 ? `+${Number(errVal).toFixed(2)}` : Number(errVal).toFixed(2)) : '0.00'}</td>
                      <td className="text-mono">{mpeVal != null ? `±${Number(mpeVal).toFixed(2)}` : '±1.00'}</td>
                      <td className="text-muted" style={{ fontSize: 12 }}>{new Date().toLocaleDateString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reviewer / PKI Digital Signature Panel (FR-10) */}
      {isReviewerOrAdmin && (
        <div className="gov-card mb-24" style={{ background: 'var(--gov-blue-light)', border: '1px solid var(--gov-blue-primary)' }}>
          <div className="gov-card-header">
            <div className="flex-gap-8">
              <ShieldCheck size={18} color="var(--gov-navy-imperial)" />
              <h4>Reviewing Officer Approval & Digital Signature (FR-10)</h4>
            </div>
          </div>
          <div className="gov-card-body">
            <p style={{ fontSize: 13, marginBottom: 12 }}>
              Cryptographically verify metrological observations and issue a PKI signed OIML compliance certificate with SHA-256 hash chaining.
            </p>
            <div className="flex-gap-8" style={{ flexWrap: 'wrap' }}>
              {session.status === 'under_review' && (
                <>
                  <button className="gov-btn gov-btn-primary" onClick={() => approveMutation.mutate()} disabled={approveMutation.isPending}>
                    <CheckCircle2 size={14} /> {approveMutation.isPending ? 'Approving...' : 'Approve Evaluation'}
                  </button>
                  <button className="gov-btn gov-btn-outline" style={{ borderColor: 'var(--gov-red)', color: 'var(--gov-red)' }} onClick={() => rejectMutation.mutate()} disabled={rejectMutation.isPending}>
                    <XCircle size={14} /> {rejectMutation.isPending ? 'Rejecting...' : 'Reject & Return to Draft'}
                  </button>
                </>
              )}
              <button className="gov-btn gov-btn-accent" onClick={() => reportMutation.mutate()} disabled={reportMutation.isPending}>
                <FileCheck size={14} /> {reportMutation.isPending ? 'Generating...' : 'Issue PKI Signed Certificate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attachments Upload & List (FR-09) */}
      <div className="gov-card">
        <div className="gov-card-header">
          <div className="flex-gap-8">
            <Paperclip size={18} />
            <h4>Photo & Document Attachments (FR-09)</h4>
          </div>
        </div>
        <div className="gov-card-body">
          <form onSubmit={handleFileUpload} className="flex-gap-8 mb-16" style={{ alignItems: 'center' }}>
            <input
              type="file"
              className="gov-input"
              style={{ padding: '6px 12px' }}
              onChange={(e) => setSelectedFile(e.target.files[0])}
            />
            <button className="gov-btn gov-btn-primary" type="submit" disabled={!selectedFile || uploadMutation.isPending}>
              <Upload size={14} /> {uploadMutation.isPending ? 'Uploading...' : 'Upload Attachment'}
            </button>
          </form>

          {attachments.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--gov-text-muted)' }}>No photos or calibration documents attached yet.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              {attachments.map((att) => (
                <div key={att._id} style={{ padding: 10, border: '1px solid var(--gov-border-subtle)', borderRadius: 'var(--gov-radius)', background: '#fff' }}>
                  <div className="text-mono" style={{ fontSize: 12, fontWeight: 600, truncate: true }}>{att.originalName || att.filename || 'Attachment'}</div>
                  <div className="text-muted" style={{ fontSize: 11 }}>{att.mimeType || 'Document'}</div>
                  {att.filePath && (
                    <a href={`http://localhost:5000/${att.filePath}`} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--gov-navy-imperial)', fontWeight: 500 }}>View File</a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
