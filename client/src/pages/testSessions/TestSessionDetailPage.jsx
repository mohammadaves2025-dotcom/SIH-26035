import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTestSessionById, updateTestSession, addObservations, updateObservation, deleteObservation, submitSession, approveSession, rejectSession, acknowledgeFlag } from '../../services/testSession.service.js';
import { generateReport } from '../../services/report.service.js';
import { getAttachments, uploadAttachment, downloadAttachment } from '../../services/attachment.service.js';
import { useAuthStore } from '../../store/useAuthStore.js';
import { useNotificationStore } from '../../store/useNotificationStore.js';
import { ANNEX_REFS } from '../../config/constants.js';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { ArrowLeft, Plus, Send, FileCheck, Scale, Paperclip, Upload, CheckCircle2, ShieldCheck, XCircle, Trash2, Pencil, AlertTriangle } from 'lucide-react';

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
  const [showSessionEditForm, setShowSessionEditForm] = useState(false);
  const [sessionEditForm, setSessionEditForm] = useState({});
  const [editingObsId, setEditingObsId] = useState(null);
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

  const editSessionMutation = useMutation({
    mutationFn: (data) => updateTestSession(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['test-session', id]);
      addToast({ type: 'success', message: 'Test session parameters updated successfully' });
      setShowSessionEditForm(false);
    },
  });

  const ackFlagMutation = useMutation({
    mutationFn: ({ obsId, flagId, comment }) => acknowledgeFlag(id, obsId, { flagId, comment }),
    onSuccess: () => {
      queryClient.invalidateQueries(['test-session', id]);
      addToast({ type: 'success', message: 'Advisory flag acknowledged' });
    },
  });

  const addObsMutation = useMutation({
    mutationFn: (data) => addObservations(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['test-session', id]);
      addToast({ type: 'success', message: 'Metrological observation recorded successfully' });
      setShowObsForm(false);
      setEditingObsId(null);
      const firstAnnex = session.selectedAnnexes?.[0] || '';
      setObsForm({ annexRef: firstAnnex, referenceLoad: '', indicatedValue: '', evaluationMethod: ANNEX_REFS.find((item) => item.value === firstAnnex)?.method || 'manual_checklist', checklistPassed: null, reviewerNotes: '', zeroCorrection: '' });
    },
  });

  const updateObsMutation = useMutation({
    mutationFn: ({ obsId, data }) => updateObservation(id, obsId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['test-session', id]);
      addToast({ type: 'success', message: 'Observation updated successfully' });
      setShowObsForm(false);
      setEditingObsId(null);
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
    mutationFn: (remarks) => generateReport(id, remarks),
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
    let payload;
    if (obsForm.evaluationMethod === 'manual_checklist') {
      if (obsForm.checklistPassed === null || !obsForm.reviewerNotes.trim()) {
        addToast({ type: 'error', message: 'Choose the checklist result and record reviewer notes.' });
        return;
      }
      payload = { annexRef: obsForm.annexRef, evaluationMethod: 'manual_checklist', checklistPassed: obsForm.checklistPassed, reviewerNotes: obsForm.reviewerNotes.trim() };
    } else {
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
      payload = { annexRef: obsForm.annexRef, evaluationMethod: 'mpe_band', referenceLoad: refLoad, indicatedValue };
      if (obsForm.zeroCorrection !== '') payload.zeroCorrection = Number(obsForm.zeroCorrection);
    }

    if (editingObsId) {
      updateObsMutation.mutate({ obsId: editingObsId, data: payload });
    } else {
      addObsMutation.mutate(payload);
    }
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
            <button className="gov-btn gov-btn-outline" onClick={() => {
              setSessionEditForm({
                serialNumber: session.serialNumber || '',
                verificationStage: session.verificationStage || 'initial',
                environmentalConditions: {
                  temperatureC: session.environmentalConditions?.temperatureC ?? '',
                  humidityPercent: session.environmentalConditions?.humidityPercent ?? '',
                  inclinationDeg: session.environmentalConditions?.inclinationDeg ?? '',
                },
              });
              setShowSessionEditForm(!showSessionEditForm);
            }}>
              <Pencil size={14} /> Edit Session Details
            </button>
            <button className="gov-btn gov-btn-accent" onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending || observations.length === 0}>
              <Send size={14} /> {submitMutation.isPending ? 'Evaluating...' : 'Submit for Evaluation'}
            </button>
          </>
        )}
        {['passed', 'failed'].includes(session.status) && isReviewerOrAdmin && (
          <button className="gov-btn gov-btn-primary" onClick={() => {
            const remarks = window.prompt('Enter optional reviewing officer remarks for the report:');
            reportMutation.mutate(remarks ? remarks.trim() : undefined);
          }} disabled={reportMutation.isPending}>
            <FileCheck size={14} /> {reportMutation.isPending ? 'Generating report...' : 'Generate test report'}
          </button>
        )}
      </div>

      {/* Session Details Edit Panel */}
      {showSessionEditForm && canEditDraft && (
        <div className="gov-card mb-24" style={{ border: '2px solid var(--gov-navy-imperial)' }}>
          <div className="gov-card-header"><h4>Edit Session Test Parameters</h4></div>
          <div className="gov-card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
              <div className="gov-form-group">
                <label className="gov-label">Serial Number</label>
                <input className="gov-input" value={sessionEditForm.serialNumber || ''} onChange={(e) => setSessionEditForm(f => ({ ...f, serialNumber: e.target.value }))} />
              </div>
              <div className="gov-form-group">
                <label className="gov-label">Verification Stage</label>
                <select className="gov-select" value={sessionEditForm.verificationStage || 'initial'} onChange={(e) => setSessionEditForm(f => ({ ...f, verificationStage: e.target.value }))}>
                  <option value="initial">Initial Verification</option>
                  <option value="subsequent">Subsequent Inspection (In-Service, 2× MPE)</option>
                </select>
              </div>
              <div className="gov-form-group">
                <label className="gov-label">Temperature (°C)</label>
                <input className="gov-input" type="number" step="any" value={sessionEditForm.environmentalConditions?.temperatureC ?? ''} onChange={(e) => setSessionEditForm(f => ({ ...f, environmentalConditions: { ...f.environmentalConditions, temperatureC: e.target.value === '' ? null : Number(e.target.value) } }))} />
              </div>
              <div className="gov-form-group">
                <label className="gov-label">Humidity (% RH)</label>
                <input className="gov-input" type="number" step="any" value={sessionEditForm.environmentalConditions?.humidityPercent ?? ''} onChange={(e) => setSessionEditForm(f => ({ ...f, environmentalConditions: { ...f.environmentalConditions, humidityPercent: e.target.value === '' ? null : Number(e.target.value) } }))} />
              </div>
            </div>
            <div className="flex-gap-8 mt-16">
              <button className="gov-btn gov-btn-primary" onClick={() => editSessionMutation.mutate(sessionEditForm)} disabled={editSessionMutation.isPending}>
                {editSessionMutation.isPending ? 'Saving...' : 'Save Parameters'}
              </button>
              <button className="gov-btn gov-btn-outline" onClick={() => setShowSessionEditForm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Observation Form Modal/Panel */}
      {showObsForm && canEditDraft && (
        <div className="gov-card mb-24" style={{ border: '2px solid var(--gov-blue-primary)' }}>
          <div className="gov-card-header"><h4>Record Metrological Observation</h4></div>
          <div className="gov-card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
              <div className="gov-form-group">
                <label className="gov-label">Annex Test Procedure</label>
                <select className="gov-select" value={obsForm.annexRef} onChange={(e) => {
                  const ref = e.target.value;
                  const criteriaData = session.ruleConfig?.testCriteria?.find(c => c.annexRef === ref);
                  let method = 'manual_checklist';
                  if (criteriaData) {
                    method = 'structured';
                  } else {
                    method = ANNEX_REFS.find((item) => item.value === ref)?.method || 'manual_checklist';
                  }
                  
                  // Initialize readings form based on criteria
                  const initReadings = criteriaData ? [Object.fromEntries(criteriaData.fields.map(f => [f.name, '']))] : [];
                  
                  setObsForm((f) => ({ 
                    ...f, 
                    annexRef: ref, 
                    evaluationMethod: method,
                    readings: initReadings
                  }));
                }}>
                  {(session.selectedAnnexes || []).map((ref) => <option key={ref} value={ref}>{ANNEX_REFS.find((item) => item.value === ref)?.label || ref}</option>)}
                </select>
              </div>
              <div className="gov-form-group">
                <label className="gov-label">Evaluation method</label>
                <p>
                  {obsForm.evaluationMethod === 'structured' ? 'Structured Test Criteria' : 
                   obsForm.evaluationMethod === 'mpe_band' ? 'MPE calculation (A4 accuracy only)' : 
                   'Manual checklist with evidence'}
                </p>
              </div>
              
              {obsForm.evaluationMethod === 'structured' && session.ruleConfig?.testCriteria?.find(c => c.annexRef === obsForm.annexRef) && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <h5 style={{ marginBottom: 10 }}>Readings</h5>
                  {(obsForm.readings || []).map((reading, rIdx) => {
                    const fields = session.ruleConfig.testCriteria.find(c => c.annexRef === obsForm.annexRef).fields;
                    return (
                      <div key={rIdx} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                        {fields.map(f => (
                          <div key={f.name} className="gov-form-group" style={{ marginBottom: 0 }}>
                            <label className="gov-label" style={{ fontSize: 12 }}>{f.labelEN} {f.required && '*'}</label>
                            {f.type === 'string' ? (
                              <input 
                                className="gov-input" 
                                value={reading[f.name] || ''} 
                                onChange={(e) => {
                                  const newReadings = [...obsForm.readings];
                                  newReadings[rIdx][f.name] = e.target.value;
                                  setObsForm(f => ({ ...f, readings: newReadings }));
                                }} 
                                style={{ padding: '6px' }}
                              />
                            ) : (
                              <input 
                                className="gov-input" 
                                type="number" step="any"
                                value={reading[f.name] ?? ''} 
                                onChange={(e) => {
                                  const newReadings = [...obsForm.readings];
                                  newReadings[rIdx][f.name] = e.target.value;
                                  setObsForm(f => ({ ...f, readings: newReadings }));
                                }} 
                                style={{ padding: '6px' }}
                              />
                            )}
                          </div>
                        ))}
                        <button 
                          className="gov-btn gov-btn-outline" 
                          type="button" 
                          onClick={() => {
                            const newReadings = obsForm.readings.filter((_, i) => i !== rIdx);
                            setObsForm(f => ({ ...f, readings: newReadings }));
                          }}
                          style={{ padding: '6px', color: 'var(--gov-red)', borderColor: 'var(--gov-red)' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })}
                  <button 
                    className="gov-btn gov-btn-outline" 
                    type="button" 
                    onClick={() => {
                      const fields = session.ruleConfig.testCriteria.find(c => c.annexRef === obsForm.annexRef).fields;
                      const newReading = Object.fromEntries(fields.map(f => [f.name, '']));
                      setObsForm(f => ({ ...f, readings: [...(f.readings || []), newReading] }));
                    }}
                  >
                    <Plus size={14} /> Add Reading
                  </button>
                </div>
              )}
              
              {obsForm.evaluationMethod === 'manual_checklist' && <>
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
              </>}
              
              {obsForm.evaluationMethod === 'mpe_band' && <>
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
            <div className="flex-gap-8 mt-16">
              <button className="gov-btn gov-btn-primary" onClick={() => {
                let payload;
                if (obsForm.evaluationMethod === 'structured') {
                  const fields = session.ruleConfig.testCriteria.find(c => c.annexRef === obsForm.annexRef).fields;
                  const parsedReadings = (obsForm.readings || []).map(r => {
                    const parsed = { ...r };
                    fields.forEach(f => {
                      if (f.type === 'number' && parsed[f.name] !== '') {
                        parsed[f.name] = Number(parsed[f.name]);
                      }
                    });
                    return parsed;
                  });
                  payload = { annexRef: obsForm.annexRef, evaluationMethod: 'structured', readings: parsedReadings };
                } else if (obsForm.evaluationMethod === 'manual_checklist') {
                  if (obsForm.checklistPassed === null || !obsForm.reviewerNotes?.trim()) {
                    addToast({ type: 'error', message: 'Choose the checklist result and record reviewer notes.' });
                    return;
                  }
                  payload = { annexRef: obsForm.annexRef, evaluationMethod: 'manual_checklist', checklistPassed: obsForm.checklistPassed, reviewerNotes: obsForm.reviewerNotes.trim() };
                } else {
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
                  payload = { annexRef: obsForm.annexRef, evaluationMethod: 'mpe_band', referenceLoad: refLoad, indicatedValue };
                  if (obsForm.zeroCorrection !== '') payload.zeroCorrection = Number(obsForm.zeroCorrection);
                }
            
                if (editingObsId) {
                  updateObsMutation.mutate({ obsId: editingObsId, data: payload });
                } else {
                  addObsMutation.mutate(payload);
                }
              }} disabled={addObsMutation.isPending || !obsForm.annexRef}>
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
        <div className="gov-card-body gov-table-wrapper" style={{ padding: 0 }}>
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
                      <td>
                        {obs.outcome || 'Pending evaluation'}
                        {obs.advisoryFlags && obs.advisoryFlags.length > 0 && (
                          <div style={{ marginTop: 4 }}>
                            {obs.advisoryFlags.map((flag, fIdx) => (
                              <div key={flag._id || fIdx} style={{ fontSize: 11, background: flag.acknowledged ? '#f0fdf4' : '#fff7ed', border: `1px solid ${flag.acknowledged ? '#bbf7d0' : '#fed7aa'}`, padding: '4px 6px', borderRadius: 4, marginTop: 4 }}>
                                <span style={{ color: flag.acknowledged ? 'var(--gov-green)' : 'var(--gov-orange)', fontWeight: 600 }}>
                                  ⚠️ {flag.flagType || 'Advisory Flag'}
                                </span>
                                <div style={{ color: '#475569' }}>{flag.message}</div>
                                {flag.acknowledged ? (
                                  <div style={{ color: 'var(--gov-green)', fontStyle: 'italic', fontSize: 10 }}>Ack: {flag.comment || 'Acknowledged'}</div>
                                ) : (
                                  isReviewerOrAdmin && (
                                    <button
                                      type="button"
                                      className="gov-btn gov-btn-outline"
                                      style={{ padding: '1px 6px', fontSize: 10, marginTop: 4, borderColor: 'var(--gov-orange)', color: 'var(--gov-orange)' }}
                                      onClick={() => {
                                        const comment = window.prompt('Enter mandatory acknowledgment comment for this advisory flag:');
                                        if (comment?.trim()) ackFlagMutation.mutate({ obsId: obs._id, flagId: flag._id, comment: comment.trim() });
                                      }}
                                    >
                                      Acknowledge Flag
                                    </button>
                                  )
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      {session.status === 'draft' && canEditDraft && (
                        <td>
                          <button
                            type="button"
                            className="gov-btn gov-btn-outline"
                            style={{ padding: '2px 6px', marginRight: 6 }}
                            onClick={() => {
                              setEditingObsId(obs._id);
                              let initReadings = [];
                              if (obs.evaluationMethod === 'structured') {
                                initReadings = obs.readings || [];
                              }
                              setObsForm({
                                annexRef: obs.annexRef,
                                referenceLoad: obs.referenceLoad ?? '',
                                indicatedValue: obs.indicatedValue ?? '',
                                evaluationMethod: obs.evaluationMethod || 'mpe_band',
                                checklistPassed: obs.checklistPassed ?? null,
                                reviewerNotes: obs.reviewerNotes || '',
                                zeroCorrection: obs.zeroCorrection ?? '',
                                readings: initReadings
                              });
                              setShowObsForm(true);
                            }}
                            title="Edit observation"
                          >
                            <Pencil size={12} />
                          </button>
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
          <div className="gov-card-body gov-table-wrapper" style={{ padding: 0 }}>
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
