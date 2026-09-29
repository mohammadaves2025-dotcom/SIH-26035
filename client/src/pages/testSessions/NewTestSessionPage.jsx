import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getInstrumentModels } from '../../services/instrumentModel.service.js';
import { getManufacturers, createManufacturer } from '../../services/manufacturer.service.js';
import apiClient from '../../services/apiClient.js';
import { createTestSession } from '../../services/testSession.service.js';
import { useNotificationStore } from '../../store/useNotificationStore.js';
import { ANNEX_REFS } from '../../config/constants.js';
import { cacheInstrumentModels, cacheLaboratories, getCachedInstrumentModels, getCachedLaboratories, saveDraftSession } from '../../services/offlineSync.js';
import { FlaskConical, ChevronRight, ChevronLeft } from 'lucide-react';

export default function NewTestSessionPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const addToast = useNotificationStore((s) => s.addToast);
  const [step, setStep] = useState(1);
  const [online, setOnline] = useState(navigator.onLine);
  const [cachedModels, setCachedModels] = useState([]);
  const [cachedLabs, setCachedLabs] = useState([]);

  const [form, setForm] = useState({
    instrumentModelId: '',
    serialNumber: '',
    labId: '',
    testDate: '',
    temperatureC: '',
    humidityPercent: '',
    inclinationDeg: '',
    verificationStage: 'initial',
    envNotes: '',
    selectedAnnexes: ['A1_administrative', 'A2_construction', 'A4_accuracy'],
  });

  const { data: modelsData } = useQuery({
    queryKey: ['instrument-models-select'],
    queryFn: () => getInstrumentModels({ limit: 200 }),
    select: (r) => Array.isArray(r?.data) ? r.data : Array.isArray(r?.data?.models) ? r.data.models : Array.isArray(r?.data?.docs) ? r.data.docs : [],
  });
  const { data: laboratories = [] } = useQuery({
    queryKey: ['laboratories-select'],
    queryFn: () => apiClient.get('/laboratories'),
    select: (response) => response?.data?.data || [],
  });
  const availableModels = modelsData?.length ? modelsData : cachedModels;
  const availableLabs = laboratories.length ? laboratories : cachedLabs;
  const selectedModel = availableModels.find((model) => (model._id || model.id) === form.instrumentModelId);

  useEffect(() => {
    const setNetworkState = () => setOnline(navigator.onLine);
    window.addEventListener('online', setNetworkState);
    window.addEventListener('offline', setNetworkState);
    getCachedInstrumentModels().then(setCachedModels).catch(() => {});
    getCachedLaboratories().then(setCachedLabs).catch(() => {});
    return () => {
      window.removeEventListener('online', setNetworkState);
      window.removeEventListener('offline', setNetworkState);
    };
  }, []);

  useEffect(() => {
    if (modelsData?.length) {
      cacheInstrumentModels(modelsData).then(() => setCachedModels(modelsData)).catch(() => {});
    }
  }, [modelsData]);

  useEffect(() => {
    if (laboratories.length) {
      cacheLaboratories(laboratories).then(() => setCachedLabs(laboratories)).catch(() => {});
    }
  }, [laboratories]);

  const createMutation = useMutation({
    mutationFn: createTestSession,
    onSuccess: (res) => {
      queryClient.invalidateQueries(['test-sessions']);
      addToast({ type: 'success', message: 'Test session created successfully' });
      const id = res?.data?._id || res?._id;
      navigate(id ? `/test-sessions/${id}` : '/test-sessions');
    },
    onError: async (error, payload) => {
      if (error?.response) return;
      try {
        const { clientId } = await saveDraftSession(payload);
        queryClient.invalidateQueries(['offline-test-session-drafts']);
        addToast({ type: 'warning', message: 'The server could not be reached. Session saved on this device for later sync.' });
        navigate(`/test-sessions/offline/${clientId}`);
      } catch {
        addToast({ type: 'error', message: 'Could not reach the server or save the session on this device.' });
      }
    },
  });

  const updateField = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const toggleAnnex = (val) => {
    setForm((f) => ({
      ...f,
      selectedAnnexes: f.selectedAnnexes.includes(val)
        ? f.selectedAnnexes.filter((a) => a !== val)
        : [...f.selectedAnnexes, val],
    }));
  };

  const handleSubmit = () => {
    if (!form.instrumentModelId || !form.labId || !form.testDate || !form.serialNumber.trim() || form.temperatureC === '' ||
        form.humidityPercent === '' || form.inclinationDeg === '' || !form.envNotes.trim() || form.selectedAnnexes.length === 0) {
      addToast({ type: 'error', message: 'Enter the serial number, test date, observed environmental conditions, and at least one applicable procedure.' });
      return;
    }
    const payload = {
      instrumentModelId: form.instrumentModelId,
      modelName: selectedModel?.modelName || '',
      manufacturerName: selectedModel?.manufacturer?.name || selectedModel?.manufacturerName || '',
      serialNumber: form.serialNumber.trim(),
      labId: form.labId,
      testDate: form.testDate,
      verificationStage: form.verificationStage,
      environmentalConditions: {
        temperatureC: Number(form.temperatureC),
        humidityPercent: Number(form.humidityPercent),
        inclinationDeg: Number(form.inclinationDeg),
        notes: form.envNotes,
      },
      selectedAnnexes: form.selectedAnnexes,
    };

    if (!online) {
      saveDraftSession(payload).then(({ clientId }) => {
        queryClient.invalidateQueries(['offline-test-session-drafts']);
        addToast({ type: 'success', message: 'Session saved on this device and queued to sync when online.' });
        navigate(`/test-sessions/offline/${clientId}`);
      }).catch(() => addToast({ type: 'error', message: 'Could not save the offline session on this device.' }));
      return;
    }
    createMutation.mutate(payload);
  };

  return (
    <div style={{ maxWidth: 740 }}>
      <div className="page-header">
        <div>
          <h1><FlaskConical size={22} style={{ marginRight: 8, verticalAlign: -3 }} />New Test Session</h1>
          <p className="page-header-subtitle">Create a new OIML R-76 evaluation session with environmental & metrological capture</p>
          {!online && <p role="status" className="text-muted">Offline mode: using the last cached instrument and laboratory lists.</p>}
        </div>
      </div>

      {/* Step indicators */}
      <div className="flex-gap-8 mb-24" style={{ justifyContent: 'center' }}>
        {[1, 2, 3, 4].map((s) => (
          <div key={s} style={{
            width: 32, height: 32, borderRadius: '50%', display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontWeight: 600,
            fontSize: 13, background: step >= s ? 'var(--gov-navy-imperial)' : '#E2E8F0',
            color: step >= s ? '#fff' : 'var(--gov-text-muted)',
          }}>{s}</div>
        ))}
      </div>

      <div className="gov-card">
        <div className="gov-card-body">

          {step === 1 && (
            <>
              <h4 style={{ marginBottom: 16 }}>Step 1 — Instrument Selection</h4>
              <div className="gov-form-group">
                <label className="gov-label">Instrument Model</label>
                <select data-testid="session-model" className="gov-select" value={form.instrumentModelId} onChange={(e) => updateField('instrumentModelId', e.target.value)}>
                  <option value="">— Select model —</option>
                  {availableModels.map((m) => (
                    <option key={m._id || m.id} value={m._id || m.id}>{m.modelName} ({m.manufacturer?.name || m.manufacturerName || '—'})</option>
                  ))}
                </select>
              </div>
              <div className="gov-form-group">
                <label className="gov-label">Serial Number</label>
                <input data-testid="session-serial" className="gov-input" required placeholder="e.g. SN-2026-00123" value={form.serialNumber} onChange={(e) => updateField('serialNumber', e.target.value)} />
              </div>
              {selectedModel && <p>Registered accuracy class: Class {selectedModel.accuracyClass}</p>}
            </>
          )}

          {step === 2 && (
            <>
              <h4 style={{ marginBottom: 16 }}>Step 2 — Environmental & Laboratory Conditions (FR-02)</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                <div className="gov-form-group">
                  <label className="gov-label">Testing Laboratory Facility</label>
                    <select data-testid="session-lab" className="gov-select" value={form.labId} onChange={(e) => updateField('labId', e.target.value)}>
                    <option value="">— Select a registered laboratory —</option>
                    {availableLabs.map((lab) => <option key={lab._id || lab.id} value={lab.labId}>{lab.labName} ({lab.location})</option>)}
                  </select>
                </div>
                <div className="gov-form-group">
                  <label className="gov-label">Evaluation Test Date</label>
                  <input data-testid="session-date" className="gov-input" required type="date" value={form.testDate} onChange={(e) => updateField('testDate', e.target.value)} />
                </div>
                <div className="gov-form-group">
                  <label className="gov-label">Verification Stage (OIML R 76 §3.5)</label>
                  <select className="gov-select" value={form.verificationStage} onChange={(e) => updateField('verificationStage', e.target.value)}>
                    <option value="initial">Initial Verification (Standard MPE)</option>
                    <option value="subsequent">Subsequent / In-Service Inspection (2× MPE)</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                <div className="gov-form-group">
                  <label className="gov-label">Ambient Temp (°C)</label>
                  <input data-testid="session-temperature" className="gov-input" required type="number" step="0.1" value={form.temperatureC} onChange={(e) => updateField('temperatureC', e.target.value)} />
                </div>
                <div className="gov-form-group">
                  <label className="gov-label">Relative Humidity (%)</label>
                  <input data-testid="session-humidity" className="gov-input" required type="number" min="0" max="100" step="1" value={form.humidityPercent} onChange={(e) => updateField('humidityPercent', e.target.value)} />
                </div>
                <div className="gov-form-group">
                  <label className="gov-label">Inclination (°)</label>
                  <input data-testid="session-inclination" className="gov-input" required type="number" step="0.01" value={form.inclinationDeg} onChange={(e) => updateField('inclinationDeg', e.target.value)} />
                </div>
              </div>
              <div className="gov-form-group">
                <label className="gov-label">Environmental Control Notes</label>
                <input data-testid="session-environment-notes" className="gov-input" required placeholder="Record the observed environmental conditions" value={form.envNotes} onChange={(e) => updateField('envNotes', e.target.value)} />
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h4 style={{ marginBottom: 16 }}>Step 3 — Metrological Parameters</h4>
              {selectedModel ? (
                <div className="gov-card-body">
                  <p>Capacity: {selectedModel.minCapacity}–{selectedModel.maxCapacity}</p>
                  <p>Verification scale interval e: {selectedModel.e}</p>
                  <p>Scale intervals n: {selectedModel.n}</p>
                  <p>Accuracy class: {selectedModel.accuracyClass}</p>
                  <small>These metrological parameters come from the selected registered model.</small>
                </div>
              ) : <p>Select a registered model first to review its metrological parameters.</p>}
            </>
          )}

          {step === 4 && (
            <>
              <h4 style={{ marginBottom: 16 }}>Step 4 — Test Annexes</h4>
              <p style={{ fontSize: 13, color: 'var(--gov-text-muted)', marginBottom: 14 }}>
                Select the OIML R-76 annexes to include in this evaluation.
              </p>
              <div className="flex-gap-8 mb-12">
                <button type="button" className="gov-btn gov-btn-outline" style={{ fontSize: 12, padding: '4px 8px' }} onClick={() => setForm(f => ({ ...f, selectedAnnexes: ANNEX_REFS.map(a => a.value) }))}>Select All</button>
                <button type="button" className="gov-btn gov-btn-outline" style={{ fontSize: 12, padding: '4px 8px' }} onClick={() => setForm(f => ({ ...f, selectedAnnexes: ['A1_administrative', 'A2_construction', 'A4_accuracy'] }))}>Select Mandatory Only</button>
                <button type="button" className="gov-btn gov-btn-outline" style={{ fontSize: 12, padding: '4px 8px' }} onClick={() => setForm(f => ({ ...f, selectedAnnexes: [] }))}>Clear All</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {ANNEX_REFS.map((a) => (
                  <label key={a.value} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', border: '1px solid var(--gov-border-subtle)', borderRadius: 'var(--gov-radius)', cursor: 'pointer', background: form.selectedAnnexes.includes(a.value) ? 'var(--gov-blue-light)' : 'transparent' }}>
                    <input type="checkbox" checked={form.selectedAnnexes.includes(a.value)} onChange={() => toggleAnnex(a.value)} />
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{a.label}</span>
                  </label>
                ))}
              </div>
            </>
          )}

          {/* Navigation */}
          <div className="flex-between" style={{ marginTop: 24 }}>
            <button className="gov-btn gov-btn-outline" disabled={step <= 1} onClick={() => setStep(step - 1)}>
              <ChevronLeft size={14} /> Back
            </button>
            {step < 4 ? (
              <button data-testid="session-next" className="gov-btn gov-btn-primary" onClick={() => setStep(step + 1)}>
                Next <ChevronRight size={14} />
              </button>
            ) : (
              <button data-testid="create-session" className="gov-btn gov-btn-accent" onClick={handleSubmit} disabled={createMutation.isPending || !form.instrumentModelId}>
                {createMutation.isPending ? 'Creating...' : online ? 'Create Session' : 'Save Offline Draft'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
