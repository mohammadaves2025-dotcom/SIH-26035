import React, { useState } from 'react';
import { getExportData } from '../../services/admin.service.js';
import { Download, FileSpreadsheet, Calendar, RefreshCw } from 'lucide-react';
import { useNotificationStore } from '../../store/useNotificationStore.js';

export default function ExportPage() {
  const addToast = useNotificationStore((s) => s.addToast);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);

  const handleExport = async (format) => {
    setLoading(true);
    try {
      const res = await getExportData({ startDate, endDate, format });
      const blob = new Blob([JSON.stringify(res, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nawi_export_${new Date().toISOString().slice(0,10)}.${format === 'csv' ? 'csv' : 'json'}`;
      a.click();
      URL.revokeObjectURL(url);
      addToast({ type: 'success', message: `Export file downloaded (${format.toUpperCase()})` });
    } catch {
      // Handled by apiClient
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 700 }}>
      <div className="page-header">
        <div>
          <h1><Download size={22} style={{ marginRight: 8, verticalAlign: -3 }} />e-Government Export</h1>
          <p className="page-header-subtitle">Export metrology data for National Legal Metrology Portal integration</p>
        </div>
      </div>

      <div className="gov-card">
        <div className="gov-card-header">
          <h4>Export Parameters</h4>
        </div>
        <div className="gov-card-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div className="gov-form-group">
              <label className="gov-label"><Calendar size={14} style={{ marginRight: 4, verticalAlign: -2 }} /> Start Date</label>
              <input className="gov-input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="gov-form-group">
              <label className="gov-label"><Calendar size={14} style={{ marginRight: 4, verticalAlign: -2 }} /> End Date</label>
              <input className="gov-input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          <div className="flex-gap-8">
            <button className="gov-btn gov-btn-primary" onClick={() => handleExport('json')} disabled={loading}>
              <Download size={14} /> {loading ? 'Exporting...' : 'Export JSON (Portal Schema)'}
            </button>
            <button className="gov-btn gov-btn-outline" onClick={() => handleExport('csv')} disabled={loading}>
              <FileSpreadsheet size={14} /> Export CSV
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
