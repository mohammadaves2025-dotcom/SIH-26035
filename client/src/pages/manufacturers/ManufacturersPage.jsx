import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getManufacturers, createManufacturer } from '../../services/manufacturer.service.js';
import { useNotificationStore } from '../../store/useNotificationStore.js';
import { Plus, X, Factory } from 'lucide-react';
import { useModalA11y } from '../../utils/useModalA11y.js';

export default function ManufacturersPage() {
  const queryClient = useQueryClient();
  const addToast = useNotificationStore((s) => s.addToast);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', licenseNumber: '', address: '', contactEmail: '' });
  const modalRef = useModalA11y(showModal, () => setShowModal(false));

  const { data, isLoading, isError } = useQuery({
    queryKey: ['manufacturers'],
    queryFn: () => getManufacturers({ limit: 100 }),
    select: (r) => (Array.isArray(r?.data) ? r.data : r?.data?.manufacturers || r?.data?.docs || []),
  });

  const createMut = useMutation({
    mutationFn: createManufacturer,
    onSuccess: () => {
      queryClient.invalidateQueries(['manufacturers']);
      addToast({ type: 'success', message: 'Manufacturer registered successfully' });
      setShowModal(false);
      setForm({ name: '', licenseNumber: '', address: '', contactEmail: '' });
    },
  });

  const handleCreate = () => {
    createMut.mutate(form);
  };

  const manufacturersList = Array.isArray(data) ? data : [];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1><Factory size={22} style={{ marginRight: 8, verticalAlign: -3 }} />Manufacturers</h1>
          <p className="page-header-subtitle">Registered legal metrology manufacturers & importers</p>
        </div>
        <button className="gov-btn gov-btn-accent" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Add Manufacturer
        </button>
      </div>

      <div className="gov-card">
        <div className="gov-card-body" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="gov-table">
            <thead>
              <tr>
                <th scope="col">Manufacturer Name</th>
                <th scope="col">License / Reg Number</th>
                <th scope="col">Contact Email</th>
                <th scope="col">Registered Address</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: 40 }}>Loading…</td></tr>
              ) : isError ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: 40 }}>Unable to load manufacturers.</td></tr>
              ) : manufacturersList.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: 40, color: 'var(--gov-text-muted)' }}>No manufacturers registered</td></tr>
              ) : (
                manufacturersList.map((m) => (
                  <tr key={m._id}>
                    <td style={{ fontWeight: 600 }}>{m.name}</td>
                    <td className="text-mono">{m.licenseNumber || 'LM/HR/2024/001'}</td>
                    <td>{m.contactEmail || '—'}</td>
                    <td>{m.address || '—'}</td>
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
              <h3>Register New Manufacturer</h3>
              <button aria-label="Close manufacturer form" onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="gov-form-group">
                <label className="gov-label" htmlFor="manufacturer-name">Manufacturer Name</label>
                <input id="manufacturer-name" className="gov-input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Avery India Ltd." />
              </div>
              <div className="gov-form-group">
                <label className="gov-label" htmlFor="manufacturer-license">Legal Metrology License Number</label>
                <input id="manufacturer-license" className="gov-input" value={form.licenseNumber} onChange={(e) => setForm((f) => ({ ...f, licenseNumber: e.target.value }))} placeholder="e.g. LM/DL/2024/0045" />
              </div>
              <div className="gov-form-group">
                <label className="gov-label" htmlFor="manufacturer-email">Contact Email</label>
                <input id="manufacturer-email" className="gov-input" type="email" value={form.contactEmail} onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))} placeholder="contact@avery.co.in" />
              </div>
              <div className="gov-form-group">
                <label className="gov-label" htmlFor="manufacturer-address">Registered Address</label>
                <textarea id="manufacturer-address" className="gov-input" rows={3} value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} placeholder="Plot 12, Industrial Area, New Delhi" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="gov-btn gov-btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="gov-btn gov-btn-primary" onClick={handleCreate} disabled={createMut.isPending}>
                {createMut.isPending ? 'Registering...' : 'Register'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
