import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getInstrumentModels } from '../../services/instrumentModel.service.js';
import { getManufacturers, createManufacturer } from '../../services/manufacturer.service.js';
import apiClient from '../../services/apiClient.js';
import { createTestSession } from '../../services/testSession.service.js';
import { useNotificationStore } from '../../store/useNotificationStore.js';
import { ANNEX_REFS } from '../../config/constants.js';
import { FlaskConical, ChevronRight, ChevronLeft } from 'lucide-react';

export default function NewTestSessionPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const addToast = useNotificationStore((s) => s.addToast);
  const [step, setStep] = useState(1);

  const [form, setForm] = useState({
    instrumentModelId: '',
    serialNumber: '',
    labId: '',
    testDate: '',
    temperatureC: '',
    humidityPercent: '',
    inclinationDeg: '',
    envNotes: '',
    selectedAnnexes: [],
  });

  const { data: modelsData } = useQuery({
    queryKey: ['instrument-models-select'],
    queryFn: () => getInstrumentModels({ limit: 200 }),
    select: (r) => Array.isArray(r?.data) ? r.data : Array.isArray(r?.data?.models) ? r.data.models : Array.isArray(r?.data?.docs) ? r.data.docs : [],
  });
  const selectedModel = (modelsData || []).find((model) => model._id === form.instrumentModelId);
  const { data: laboratories = [] } = useQuery({
    queryKey: ['laboratories-select'],
    queryFn: () => apiClient.get('/laboratories'),
    select: (response) => response?.data?.data || [],
  });

  const createMutation = useMutation({
    mutationFn: createTestSession,
    onSuccess: (res) => {
      queryClient.invalidateQueries(['test-sessions']);
      addToast({ type: 'success', message: 'Test session created successfully' });
      const id = res?.data?._id || res?._id;
      navigate(id ? `/test-sessions/${id}` : '/test-sessions');
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
    if (!form.testDate || !form.serialNumber.trim() || form.temperatureC === '' ||
        form.humidityPercent === '' || form.inclinationDeg === '' || !form.envNotes.trim() || form.selectedAnnexes.length === 0) {
      addToast({ type: 'error', message: 'Enter the serial number, test date, observed environmental conditions, and at least one applicable procedure.' });
      return;
    }
    createMutation.mutate({
      instrumentModelId: form.instrumentModelId,
      serialNumber: form.serialNumber.trim(),
      labId: form.labId,
      testDate: form.testDate,
      environmentalConditions: {
        temperatureC: Number(form.temperatureC),
        humidityPercent: Number(form.humidityPercent),
        inclinationDeg: Number(form.inclinationDeg),
        notes: form.envNotes,
      },
      selectedAnnexes: form.selectedAnnexes,
    });
  };

  return (
    <div style={{ maxWidth: 740 }}>
      <div className="page-header">
        <div>
          <h1><FlaskConical size={22} style={{ marginRight: 8, verticalAlign: -3 }} />New Test Session</h1>
          <p className="page-header-subtitle">Create a new OIML R-76 evaluation session with environmental & metrological capture</p>
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
                <select className="gov-select" value={form.instrumentModelId} onChange={(e) => updateField('instrumentModelId', e.target.value)}>
                  <option value="">— Select model —</option>
                  {(modelsData || []).map((m) => (
                    <option key={m._id} value={m._id}>{m.modelName} ({m.manufacturer?.name || '—'})</option>
                  ))}
                </select>
              </div>
              <div className="gov-form-group">
                <label className="gov-label">Serial Number</label>
                <input className="gov-input" required placeholder="e.g. SN-2026-00123" value={form.serialNumber} onChange={(e) => updateField('serialNumber', e.target.value)} />
              </div>
              {selectedModel && <p>Registered accuracy class: Class {selectedModel.accuracyClass}</p>}
            </>
          )}

          {step === 2 && (
            <>
              <h4 style={{ marginBottom: 16 }}>Step 2 — Environmental & Laboratory Conditions (FR-02)</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="gov-form-group">
                  <label className="gov-label">Testing Laboratory Facility</label>
                  <select className="gov-select" value={form.labId} onChange={(e) => updateField('labId', e.target.value)}>
                    <option value="">— Select a registered laboratory —</option>
                    {laboratories.map((lab) => <option key={lab._id} value={lab.labId}>{lab.labName} ({lab.location})</option>)}
                  </select>
                </div>
                <div className="gov-form-group">
                  <label className="gov-label">Evaluation Test Date</label>
                  <input className="gov-input" required type="date" value={form.testDate} onChange={(e) => updateField('testDate', e.target.value)} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div className="gov-form-group">
                  <label className="gov-label">Ambient Temp (°C)</label>
                  <input className="gov-input" required type="number" step="0.1" value={form.temperatureC} onChange={(e) => updateField('temperatureC', e.target.value)} />
                </div>
                <div className="gov-form-group">
                  <label className="gov-label">Relative Humidity (%)</label>
                  <input className="gov-input" required type="number" min="0" max="100" step="1" value={form.humidityPercent} onChange={(e) => updateField('humidityPercent', e.target.value)} />
                </div>
                <div className="gov-form-group">
                  <label className="gov-label">Inclination (°)</label>
                  <input className="gov-input" required type="number" step="0.01" value={form.inclinationDeg} onChange={(e) => updateField('inclinationDeg', e.target.value)} />
                </div>
              </div>
              <div className="gov-form-group">
                <label className="gov-label">Environmental Control Notes</label>
                <input className="gov-input" required placeholder="Record the observed environmental conditions" value={form.envNotes} onChange={(e) => updateField('envNotes', e.target.value)} />
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
              <button className="gov-btn gov-btn-primary" onClick={() => setStep(step + 1)}>
                Next <ChevronRight size={14} />
              </button>
            ) : (
              <button className="gov-btn gov-btn-accent" onClick={handleSubmit} disabled={createMutation.isPending || !form.instrumentModelId}>
                {createMutation.isPending ? 'Creating...' : 'Create Session'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
