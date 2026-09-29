import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../services/apiClient.js';
import { useNotificationStore } from '../../store/useNotificationStore.js';
import { useAuthStore } from '../../store/useAuthStore.js';
import { Building2, Plus, X, MapPin, Award } from 'lucide-react';
import { useModalA11y } from '../../utils/useModalA11y.js';

export default function LaboratoriesPage() {
  const queryClient = useQueryClient();
  const addToast = useNotificationStore((s) => s.addToast);
  const role = useAuthStore((s) => s.user?.role);
  const canManageLaboratories = role === 'admin';
  const [showModal, setShowModal] = useState(false);
  const [editingLab, setEditingLab] = useState(null);
  const [form, setForm] = useState({
    code: '',
    name: '',
    location: '',
    contactEmail: '',
    accreditationNumber: '',
    latitude: '',
    longitude: '',
    radiusM: '',
  });
  const modalRef = useModalA11y(showModal, () => setShowModal(false));

  const { data, isLoading, isError } = useQuery({
    queryKey: ['laboratories-list'],
    queryFn: () => apiClient.get('/laboratories'),
    select: (r) => r?.data?.data || r?.data || [],
  });

  const createMut = useMutation({
    mutationFn: (newLab) => apiClient.post('/laboratories', newLab),
    onSuccess: () => {
      queryClient.invalidateQueries(['laboratories-list']);
      addToast({ type: 'success', message: 'Testing Laboratory registered' });
      setShowModal(false);
      setEditingLab(null);
      setForm({ code: '', name: '', location: '', contactEmail: '', accreditationNumber: '', latitude: '', longitude: '', radiusM: '' });
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, updates }) => apiClient.patch(`/laboratories/${id}`, updates),
    onSuccess: () => {
      queryClient.invalidateQueries(['laboratories-list']);
      addToast({ type: 'success', message: 'Laboratory GPS boundary updated' });
      setShowModal(false);
      setEditingLab(null);
    },
  });

  const handleCreate = () => {
    const geofence = { latitude: form.latitude, longitude: form.longitude, radiusM: form.radiusM };
    const payload = {
      code: form.code,
      name: form.name,
      location: form.location,
      contactEmail: form.contactEmail,
      accreditationNumber: form.accreditationNumber,
      geofence,
    };
    if (editingLab) {
      updateMut.mutate({ id: editingLab._id, updates: { geofence } });
    } else {
      createMut.mutate(payload);
    }
  };

  const openEdit = (lab) => {
    setEditingLab(lab);
    setForm({
      code: lab.labId || '',
      name: lab.labName || '',
      location: lab.location || '',
      contactEmail: lab.contactEmail || '',
      accreditationNumber: lab.accreditationNo || '',
      latitude: lab.geofence?.latitude ?? '',
      longitude: lab.geofence?.longitude ?? '',
      radiusM: lab.geofence?.radiusM ?? '',
    });
    setShowModal(true);
  };

  const labsList = Array.isArray(data) ? data : [];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1><Building2 size={22} style={{ marginRight: 8, verticalAlign: -3 }} />Testing Laboratories</h1>
          <p className="page-header-subtitle">NABL accredited legal metrology testing facilities & RRSLs</p>
        </div>
        {canManageLaboratories && (
          <button className="gov-btn gov-btn-accent" onClick={() => { setEditingLab(null); setShowModal(true); }}>
            <Plus size={16} /> Register Laboratory
          </button>
        )}
      </div>

      <div className="gov-card">
        <div className="gov-card-body" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="gov-table">
            <thead>
              <tr>
                <th scope="col">Lab Code</th>
                <th scope="col">Laboratory Name</th>
                <th scope="col">Location</th>
                <th scope="col">Accreditation No.</th>
                <th scope="col">Status</th>
                {canManageLaboratories && <th scope="col">GPS Boundary</th>}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={canManageLaboratories ? 6 : 5} style={{ textAlign: 'center', padding: 40 }}>Loading…</td></tr>
              ) : isError ? (
                <tr><td colSpan={canManageLaboratories ? 6 : 5} style={{ textAlign: 'center', padding: 40 }}>Unable to load laboratories.</td></tr>
              ) : labsList.length === 0 ? (
                <tr><td colSpan={canManageLaboratories ? 6 : 5} style={{ textAlign: 'center', padding: 40, color: 'var(--gov-text-muted)' }}>No laboratories registered</td></tr>
              ) : (
                labsList.map((lab) => (
                  <tr key={lab._id}>
                    <td><strong className="text-mono">{lab.labId}</strong></td>
                    <td style={{ fontWeight: 600 }}>{lab.labName}</td>
                    <td><MapPin size={12} style={{ verticalAlign: -1, marginRight: 4 }} />{lab.location || 'India'}</td>
                    <td className="text-mono">{lab.accreditationNo || '—'}</td>
                    <td><span className="gov-badge gov-badge-passed">Accredited</span></td>
                    {canManageLaboratories && (
                      <td>
                        <button className="gov-btn gov-btn-outline" onClick={() => openEdit(lab)}>
                          {lab.geofence?.latitude !== null && lab.geofence?.latitude !== undefined ? 'Edit GPS' : 'Configure GPS'}
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div ref={modalRef} className="modal-content" role="dialog" aria-modal="true">
            <div className="modal-header">
              <h3>{editingLab ? 'Configure Laboratory GPS Boundary' : 'Register Testing Laboratory'}</h3>
              <button aria-label="Close laboratory form" onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="gov-form-group">
                <label className="gov-label" htmlFor="lab-code">Laboratory Code</label>
                <input id="lab-code" className="gov-input" placeholder="e.g. LAB-HYDERABAD-05" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} />
              </div>
              <div className="gov-form-group">
                <label className="gov-label" htmlFor="lab-name">Laboratory Name</label>
                <input id="lab-name" className="gov-input" placeholder="e.g. RRSL Hyderabad Central Lab" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="gov-form-group">
                <label className="gov-label" htmlFor="lab-location">Location / City</label>
                <input id="lab-location" className="gov-input" placeholder="e.g. Hyderabad, Telangana" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
              </div>
              <div className="gov-form-group">
                <label className="gov-label" htmlFor="lab-accreditation">NABL Accreditation Number</label>
                <input id="lab-accreditation" className="gov-input" placeholder="e.g. NABL-TC-9012" value={form.accreditationNumber} onChange={(e) => setForm((f) => ({ ...f, accreditationNumber: e.target.value }))} />
              </div>
              <div className="gov-form-group">
                <label className="gov-label" htmlFor="lab-email">Official Contact Email</label>
                <input id="lab-email" className="gov-input" type="email" placeholder="lab@doca.gov.in" value={form.contactEmail} onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))} />
              </div>
              <fieldset className="gov-form-group" style={{ border: '1px solid var(--gov-border)', padding: 12 }}>
                <legend>Anti-spoof GPS boundary</legend>
                <label className="gov-label" htmlFor="lab-latitude">Latitude</label>
                <input id="lab-latitude" className="gov-input" type="number" min="-90" max="90" step="any" placeholder="e.g. 28.6139" value={form.latitude} onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value }))} />
                <label className="gov-label" htmlFor="lab-longitude">Longitude</label>
                <input id="lab-longitude" className="gov-input" type="number" min="-180" max="180" step="any" placeholder="e.g. 77.2090" value={form.longitude} onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value }))} />
                <label className="gov-label" htmlFor="lab-radius">Allowed radius (metres)</label>
                <input id="lab-radius" className="gov-input" type="number" min="10" max="10000" step="1" placeholder="e.g. 250" value={form.radiusM} onChange={(e) => setForm((f) => ({ ...f, radiusM: e.target.value }))} />
              </fieldset>
            </div>
            <div className="modal-footer">
              <button className="gov-btn gov-btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="gov-btn gov-btn-primary" onClick={handleCreate} disabled={createMut.isPending || updateMut.isPending || (!editingLab && (!form.code || !form.name))}>
                {createMut.isPending || updateMut.isPending ? 'Saving...' : editingLab ? 'Save GPS Boundary' : 'Register Laboratory'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
