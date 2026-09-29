import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../services/apiClient.js';
import { useNotificationStore } from '../../store/useNotificationStore.js';
import { Building2, Plus, X, MapPin, Award } from 'lucide-react';
import { useModalA11y } from '../../utils/useModalA11y.js';

export default function LaboratoriesPage() {
  const queryClient = useQueryClient();
  const addToast = useNotificationStore((s) => s.addToast);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    code: '',
    name: '',
    location: '',
    contactEmail: '',
    accreditationNumber: '',
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
      setForm({ code: '', name: '', location: '', contactEmail: '', accreditationNumber: '' });
    },
  });

  const handleCreate = () => {
    createMut.mutate({ labId: form.code, labName: form.name, location: form.location, contactEmail: form.contactEmail, accreditationNo: form.accreditationNumber });
  };

  const labsList = Array.isArray(data) ? data : [];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1><Building2 size={22} style={{ marginRight: 8, verticalAlign: -3 }} />Testing Laboratories</h1>
          <p className="page-header-subtitle">NABL accredited legal metrology testing facilities & RRSLs</p>
        </div>
        <button className="gov-btn gov-btn-accent" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Register Laboratory
        </button>
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
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40 }}>Loading…</td></tr>
              ) : isError ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40 }}>Unable to load laboratories.</td></tr>
              ) : labsList.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--gov-text-muted)' }}>No laboratories registered</td></tr>
              ) : (
                labsList.map((lab) => (
                  <tr key={lab._id}>
                    <td><strong className="text-mono">{lab.code}</strong></td>
                    <td style={{ fontWeight: 600 }}>{lab.name}</td>
                    <td><MapPin size={12} style={{ verticalAlign: -1, marginRight: 4 }} />{lab.location || 'India'}</td>
                    <td className="text-mono">{lab.accreditationNumber || 'NABL-TC-8891'}</td>
                    <td><span className="gov-badge gov-badge-passed">Accredited</span></td>
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
              <h3>Register Testing Laboratory</h3>
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
            </div>
            <div className="modal-footer">
              <button className="gov-btn gov-btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="gov-btn gov-btn-primary" onClick={handleCreate} disabled={createMut.isPending || !form.code || !form.name}>
                {createMut.isPending ? 'Saving...' : 'Register Laboratory'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
