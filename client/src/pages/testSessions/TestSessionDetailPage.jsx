import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTestSessionById, addObservations, updateObservation, deleteObservation, submitSession, approveSession, rejectSession } from '../../services/testSession.service.js';
import { generateReport } from '../../services/report.service.js';
import { getAttachments, uploadAttachment, downloadAttachment } from '../../services/attachment.service.js';
import { useAuthStore } from '../../store/useAuthStore.js';
import { useNotificationStore } from '../../store/useNotificationStore.js';
import { ANNEX_REFS } from '../../config/constants.js';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { ArrowLeft, Plus, Send, FileCheck, Scale, Paperclip, Upload, CheckCircle2, ShieldCheck, XCircle, Trash2 } from 'lucide-react';

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
    checklistPassed: null,
    reviewerNotes: '',
    zeroCorrection: '',
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
      const firstAnnex = session.selectedAnnexes?.[0] || '';
      setObsForm({ annexRef: firstAnnex, referenceLoad: '', indicatedValue: '', evaluationMethod: ANNEX_REFS.find((item) => item.value === firstAnnex)?.method || 'manual_checklist', checklistPassed: null, reviewerNotes: '', zeroCorrection: '' });
    },
  });

  const deleteObsMutation = useMutation({
    mutationFn: (obsId) => deleteObservation(id, obsId),
    onSuccess: () => {
      queryClient.invalidateQueries(['test-session', id]);
      addToast({ type: 'success', message: 'Observation removed successfully' });
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
    mutationFn: (reason) => rejectSession(id, reason),
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
      addToast({ type: 'success', message: 'Report and integrity tags generated' });
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
  const results = session.results || session.evaluationResults || observations;
  const attachments = Array.isArray(attachmentsData) ? attachmentsData : [];
  const userRole = user?.role;
  const isReviewerOrAdmin = ['admin', 'reviewer'].includes(userRole);
  const canEditDraft = ['admin', 'lab_technician', 'lab_admin'].includes(userRole);

  const handleAttachmentDownload = async (attachment) => {
    const blob = await downloadAttachment(attachment._id);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = attachment.originalFilename || 'attachment';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleAddObs = () => {
    if (obsForm.evaluationMethod === 'manual_checklist') {
      if (obsForm.checklistPassed === null || !obsForm.reviewerNotes.trim()) {
        addToast({ type: 'error', message: 'Choose the checklist result and record reviewer notes.' });
        return;
      }
      addObsMutation.mutate({ annexRef: obsForm.annexRef, evaluationMethod: 'manual_checklist', checklistPassed: obsForm.checklistPassed, reviewerNotes: obsForm.reviewerNotes.trim() });
      return;
    }
    if (obsForm.referenceLoad === '' || obsForm.indicatedValue === '') {
      addToast({ type: 'error', message: 'Enter both the applied reference load and instrument indication.' });
      return;
    }
    const refLoad = Number(obsForm.referenceLoad);
    const indicatedValue = Number(obsForm.indicatedValue);
    if (!Number.isFinite(refLoad) || !Number.isFinite(indicatedValue)) {
      addToast({ type: 'error', message: 'Observation values must be finite numbers.' });
      return;
    }
    const observation = { annexRef: obsForm.annexRef, evaluationMethod: 'mpe_band', referenceLoad: refLoad, indicatedValue };
    if (obsForm.zeroCorrection !== '') observation.zeroCorrection = Number(obsForm.zeroCorrection);
    addObsMutation.mutate(observation);
  };

  const handleFileUpload = (e) => {
    e.preventDefault();
    if (!selectedFile) return;
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('fileType', selectedFile.type.startsWith('image/') ? 'photo' : 'document');
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
            <div><span className="text-muted" style={{ fontSize: 12 }}>Instrument Model</span><br /><strong>{session.modelName || session.instrumentModelId?.modelName || '—'}</strong></div>
            <div><span className="text-muted" style={{ fontSize: 12 }}>Serial Number</span><br /><strong className="text-mono">{session.serialNumber || '—'}</strong></div>
            <div><span className="text-muted" style={{ fontSize: 12 }}>Accuracy Class</span><br /><strong>Class {session.accuracyClass || '—'}</strong></div>
            <div><span className="text-muted" style={{ fontSize: 12 }}>Max Capacity (Max)</span><br /><strong>{session.maxCapacity ?? '—'}</strong></div>
            <div><span className="text-muted" style={{ fontSize: 12 }}>Min Capacity (Min)</span><br /><strong>{session.minCapacity ?? '—'}</strong></div>
            <div><span className="text-muted" style={{ fontSize: 12 }}>Scale Interval (e)</span><br /><strong>{session.scaleInterval ?? '—'}</strong></div>
            <div><span className="text-muted" style={{ fontSize: 12 }}>Verification Stage</span><br /><strong>{session.verificationStage === 'subsequent' ? 'Subsequent Inspection (2× MPE)' : 'Initial Verification'}</strong></div>
            <div><span className="text-muted" style={{ fontSize: 12 }}>Laboratory ID</span><br /><strong className="text-mono">{session.labId || '—'}</strong></div>
            <div><span className="text-muted" style={{ fontSize: 12 }}>Ambient Conditions</span><br /><strong>{session.environmentalConditions?.temperatureC ?? '—'}°C | {session.environmentalConditions?.humidityPercent ?? '—'}% RH</strong></div>
          </div>
        </div>
      </div>

      {/* Reviewer Rejection Alert Banner */}
      {session.status === 'draft' && session.reviewerNotes && (
        <div className="gov-card mb-24" style={{ borderLeft: '4px solid var(--gov-red)', background: '#fff5f5' }}>
          <div className="gov-card-body">
            <div className="flex-gap-8" style={{ color: 'var(--gov-red)', fontWeight: 600, marginBottom: 4 }}>
              <XCircle size={16} /> Session Returned for Revision by Reviewer
            </div>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--gov-text)' }}>
              <strong>Reviewer Notes:</strong> {session.reviewerNotes}
            </p>
            {session.rejectedAt && (
              <div className="text-muted" style={{ fontSize: 11, marginTop: 4 }}>
                Returned on: {new Date(session.rejectedAt).toLocaleString()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex-gap-8 mb-24" style={{ flexWrap: 'wrap' }}>
        {session.status === 'draft' && canEditDraft && (
          <>
            <button className="gov-btn gov-btn-primary" onClick={() => setShowObsForm(!showObsForm)}>
              <Plus size={14} /> Add Observation
            </button>
            <button className="gov-btn gov-btn-accent" onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending || observations.length === 0}>
              <Send size={14} /> {submitMutation.isPending ? 'Evaluating...' : 'Submit for Evaluation'}
            </button>
          </>
        )}
        {['passed', 'failed'].includes(session.status) && isReviewerOrAdmin && (
          <button className="gov-btn gov-btn-primary" onClick={() => reportMutation.mutate()} disabled={reportMutation.isPending}>
            <FileCheck size={14} /> {reportMutation.isPending ? 'Generating report...' : 'Generate test report'}
          </button>
        )}
      </div>

      {/* Observation Form Modal/Panel */}
      {showObsForm && canEditDraft && (
        <div className="gov-card mb-24" style={{ border: '2px solid var(--gov-blue-primary)' }}>
          <div className="gov-card-header"><h4>Record Metrological Observation</h4></div>
          <div className="gov-card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="gov-form-group">
                <label className="gov-label">Annex Test Procedure</label>
                <select className="gov-select" value={obsForm.annexRef} onChange={(e) => {
                  const ref = e.target.value;
                  setObsForm((f) => ({ ...f, annexRef: ref, evaluationMethod: ANNEX_REFS.find((item) => item.value === ref)?.method || 'manual_checklist' }));
                }}>
                  {(session.selectedAnnexes || []).map((ref) => <option key={ref} value={ref}>{ANNEX_REFS.find((item) => item.value === ref)?.label || ref}</option>)}
                </select>
              </div>
              <div className="gov-form-group"><label className="gov-label">Evaluation method</label><p>{obsForm.evaluationMethod === 'mpe_band' ? 'MPE calculation (A4 accuracy only)' : 'Manual checklist with evidence'}</p></div>
              {obsForm.evaluationMethod === 'manual_checklist' ? <>
                <div className="gov-form-group">
                  <label className="gov-label">Checklist result</label>
                  <select className="gov-select" value={obsForm.checklistPassed === null ? '' : String(obsForm.checklistPassed)} onChange={(e) => setObsForm((f) => ({ ...f, checklistPassed: e.target.value === '' ? null : e.target.value === 'true' }))}>
                    <option value="">Select result</option><option value="true">Pass</option><option value="false">Fail</option>
                  </select>
                </div>
                <div className="gov-form-group">
                  <label className="gov-label">Reviewer notes / evidence</label>
                  <input className="gov-input" value={obsForm.reviewerNotes} onChange={(e) => setObsForm((f) => ({ ...f, reviewerNotes: e.target.value }))} />
                </div>
              </> : <>
              <div className="gov-form-group">
                <label className="gov-label">Reference load (same unit as registered model; kg)</label>
                <input className="gov-input" type="number" step="any" value={obsForm.referenceLoad} onChange={(e) => setObsForm((f) => ({ ...f, referenceLoad: e.target.value }))} />
              </div>
              <div className="gov-form-group">
                <label className="gov-label">Instrument indication (kg)</label>
                <input className="gov-input" type="number" step="any" value={obsForm.indicatedValue} onChange={(e) => setObsForm((f) => ({ ...f, indicatedValue: e.target.value }))} />
              </div>
              <div className="gov-form-group">
                <label className="gov-label">Zero correction (optional offset to indication; kg)</label>
                <input className="gov-input" type="number" step="any" value={obsForm.zeroCorrection} onChange={(e) => setObsForm((f) => ({ ...f, zeroCorrection: e.target.value }))} />
              </div>
              </>}
            </div>
            <div className="flex-gap-8">
              <button className="gov-btn gov-btn-primary" onClick={handleAddObs} disabled={addObsMutation.isPending || !obsForm.annexRef}>
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
                  <th>Reference load (kg)</th>
                  <th>Indication (kg)</th>
                  <th>Computed error</th>
                  <th>Applied MPE</th>
                  <th>Margin to MPE</th>
                  <th>Outcome</th>
                  {session.status === 'draft' && canEditDraft && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {observations.map((obs, i) => {
                  return (
                    <tr key={obs._id || i}>
                      <td>{i + 1}</td>
                      <td><span className="gov-badge gov-badge-info">{obs.annexRef}</span></td>
                      <td className="text-mono">{obs.referenceLoad ?? '—'}</td>
                      <td className="text-mono">{obs.indicatedValue ?? '—'}</td>
                      <td className="text-mono">{obs.computedError !== undefined && obs.computedError !== null ? (obs.computedError > 0 ? `+${obs.computedError}` : obs.computedError) : 'Pending evaluation'}</td>
                      <td className="text-mono">{obs.appliedMpe != null ? `±${obs.appliedMpe}` : '—'}</td>
                      <td className="text-mono">{obs.marginToMpe != null ? (obs.marginToMpe >= 0 ? `+${obs.marginToMpe.toFixed(4)}` : `${obs.marginToMpe.toFixed(4)}`) : '—'}</td>
                      <td>{obs.outcome || 'Pending evaluation'}</td>
                      {session.status === 'draft' && canEditDraft && (
                        <td>
                          <button
                            type="button"
                            className="gov-btn gov-btn-outline"
                            style={{ padding: '2px 6px', color: 'var(--gov-red)', borderColor: 'var(--gov-red)' }}
                            onClick={() => deleteObsMutation.mutate(obs._id)}
                            disabled={deleteObsMutation.isPending}
                            title="Delete observation"
                          >
                            <Trash2 size={12} />
                          </button>
                        </td>
                      )}
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
                  <th>Margin to MPE</th>
                  <th>Evaluated At</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => {
                  const errVal = r.computedError ?? r.error;
                  const mpeVal = r.appliedMpe ?? r.mpe;
                  const marginVal = r.marginToMpe;
                  const verdict = (r.outcome ?? r.verdict) || 'passed';
                  return (
                    <tr key={i}>
                      <td><strong>{r.annexRef}</strong></td>
                      <td><StatusBadge status={verdict} /></td>
                      <td className="text-mono">{errVal != null ? (Number(errVal) > 0 ? `+${Number(errVal)}` : Number(errVal)) : '—'}</td>
                      <td className="text-mono">{mpeVal != null ? `±${Number(mpeVal)}` : '—'}</td>
                      <td className="text-mono">{marginVal != null ? (Number(marginVal) >= 0 ? `+${Number(marginVal).toFixed(4)}` : `${Number(marginVal).toFixed(4)}`) : '—'}</td>
                      <td className="text-muted" style={{ fontSize: 12 }}>{r.updatedAt ? new Date(r.updatedAt).toLocaleDateString() : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reviewer approval and report integrity panel */}
      {isReviewerOrAdmin && (
        <div className="gov-card mb-24" style={{ background: 'var(--gov-blue-light)', border: '1px solid var(--gov-blue-primary)' }}>
          <div className="gov-card-header">
            <div className="flex-gap-8">
              <ShieldCheck size={18} color="var(--gov-navy-imperial)" />
              <h4>Reviewing Officer Approval & Report Integrity (FR-10)</h4>
            </div>
          </div>
          <div className="gov-card-body">
            <p style={{ fontSize: 13, marginBottom: 12 }}>
              Review the recorded evaluation, then generate a test report with SHA-256 integrity verification and an HMAC tag. HMAC is not a PKI digital signature.
            </p>
            <div className="flex-gap-8" style={{ flexWrap: 'wrap' }}>
              {session.status === 'under_review' && (
                <>
                  <button className="gov-btn gov-btn-primary" onClick={() => approveMutation.mutate()} disabled={approveMutation.isPending}>
                    <CheckCircle2 size={14} /> {approveMutation.isPending ? 'Approving...' : 'Approve Evaluation'}
                  </button>
                  <button className="gov-btn gov-btn-outline" style={{ borderColor: 'var(--gov-red)', color: 'var(--gov-red)' }} onClick={() => { const reason = window.prompt('Enter the reason for rejection'); if (reason?.trim()) rejectMutation.mutate(reason.trim()); }} disabled={rejectMutation.isPending}>
                    <XCircle size={14} /> {rejectMutation.isPending ? 'Rejecting...' : 'Reject & Return to Draft'}
                  </button>
                </>
              )}
              <button className="gov-btn gov-btn-accent" onClick={() => reportMutation.mutate()} disabled={reportMutation.isPending}>
                <FileCheck size={14} /> {reportMutation.isPending ? 'Generating...' : 'Generate test report'}
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
          {canEditDraft && ['draft', 'submitted'].includes(session.status) && <form onSubmit={handleFileUpload} className="flex-gap-8 mb-16" style={{ alignItems: 'center' }}>
            <input
              type="file"
              className="gov-input"
              style={{ padding: '6px 12px' }}
              onChange={(e) => setSelectedFile(e.target.files[0])}
            />
            <button className="gov-btn gov-btn-primary" type="submit" disabled={!selectedFile || uploadMutation.isPending}>
              <Upload size={14} /> {uploadMutation.isPending ? 'Uploading...' : 'Upload Attachment'}
            </button>
          </form>}

          {attachments.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--gov-text-muted)' }}>No photos or calibration documents attached yet.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              {attachments.map((att) => (
                <div key={att._id} style={{ padding: 10, border: '1px solid var(--gov-border-subtle)', borderRadius: 'var(--gov-radius)', background: '#fff' }}>
                  <div className="text-mono" style={{ fontSize: 12, fontWeight: 600, truncate: true }}>{att.originalFilename || 'Attachment'}</div>
                  <div className="text-muted" style={{ fontSize: 11 }}>{att.fileType || 'Document'}</div>
                  <button type="button" onClick={() => handleAttachmentDownload(att)} style={{ fontSize: 12, color: 'var(--gov-navy-imperial)', fontWeight: 500 }}>Download file</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
