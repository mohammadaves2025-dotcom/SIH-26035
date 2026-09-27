import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getManufacturers, createManufacturer } from '../../services/manufacturer.service.js';
import { useNotificationStore } from '../../store/useNotificationStore.js';
import { Plus, X, Factory } from 'lucide-react';

export default function ManufacturersPage() {
  const queryClient = useQueryClient();
  const addToast = useNotificationStore((s) => s.addToast);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', licenseNumber: '', address: '', contactEmail: '' });

  const { data, isLoading } = useQuery({
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
                <th>Manufacturer Name</th>
                <th>License / Reg Number</th>
                <th>Contact Email</th>
                <th>Registered Address</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: 40 }}>Loading…</td></tr>
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
          <div className="modal-content">
            <div className="modal-header">
              <h3>Register New Manufacturer</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="gov-form-group">
                <label className="gov-label">Manufacturer Name</label>
                <input className="gov-input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Avery India Ltd." />
              </div>
              <div className="gov-form-group">
                <label className="gov-label">Legal Metrology License Number</label>
                <input className="gov-input" value={form.licenseNumber} onChange={(e) => setForm((f) => ({ ...f, licenseNumber: e.target.value }))} placeholder="e.g. LM/DL/2024/0045" />
              </div>
              <div className="gov-form-group">
                <label className="gov-label">Contact Email</label>
                <input className="gov-input" type="email" value={form.contactEmail} onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))} placeholder="contact@avery.co.in" />
              </div>
              <div className="gov-form-group">
                <label className="gov-label">Registered Address</label>
                <textarea className="gov-input" rows={3} value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} placeholder="Plot 12, Industrial Area, New Delhi" />
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
