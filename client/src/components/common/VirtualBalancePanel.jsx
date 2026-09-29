import React, { useMemo, useState } from 'react';

export default function VirtualBalancePanel({ onApply, unit = 'kg' }) {
  const [referenceLoad, setReferenceLoad] = useState('100');
  const [error, setError] = useState('0');
  const [stable, setStable] = useState(true);

  const indicatedValue = useMemo(() => {
    const load = Number(referenceLoad);
    const offset = Number(error);
    return Number.isFinite(load) && Number.isFinite(offset) ? load + offset : null;
  }, [referenceLoad, error]);

  const canApply = stable && indicatedValue !== null && Number(referenceLoad) >= 0;

  return (
    <div className="gov-card" style={{ marginTop: 12, background: '#F8FAFC', border: '1px solid #CBD5E1' }} data-testid="virtual-balance-panel">
      <div className="gov-card-header">
        <h5 style={{ margin: 0 }}>Virtual Balance Scale</h5>
        <span className="gov-badge gov-badge-info">Simulator</span>
      </div>
      <div className="gov-card-body">
        <p className="text-muted" style={{ marginTop: 0, fontSize: 12 }}>
          Generates a simulated instrument indication for demonstration and testing. The server remains responsible for evaluation.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          <div className="gov-form-group">
            <label className="gov-label" htmlFor="virtual-reference-load">Applied load ({unit})</label>
            <input id="virtual-reference-load" className="gov-input" type="number" step="any" min="0" value={referenceLoad} onChange={(event) => setReferenceLoad(event.target.value)} />
          </div>
          <div className="gov-form-group">
            <label className="gov-label" htmlFor="virtual-error">Simulated indication error ({unit})</label>
            <input id="virtual-error" className="gov-input" type="number" step="any" value={error} onChange={(event) => setError(event.target.value)} />
          </div>
          <div className="gov-form-group">
            <label className="gov-label" htmlFor="virtual-stability">Instrument state</label>
            <select id="virtual-stability" className="gov-select" value={stable ? 'stable' : 'unstable'} onChange={(event) => setStable(event.target.value === 'stable')}>
              <option value="stable">Stable</option>
              <option value="unstable">Unstable</option>
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
          <strong className="text-mono" aria-live="polite">
            Indication: {indicatedValue === null ? '—' : `${indicatedValue} ${unit}`}
          </strong>
          <button
            type="button"
            className="gov-btn gov-btn-primary"
            data-testid="virtual-balance-apply"
            disabled={!canApply}
            onClick={() => onApply({ referenceLoad: Number(referenceLoad), indicatedValue })}
          >
            Use Reading
          </button>
        </div>
      </div>
    </div>
  );
}
