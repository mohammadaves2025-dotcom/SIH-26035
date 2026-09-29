import { describe, expect, it } from 'vitest';
import { createStatusPie3dTraces } from './statusPie3d.js';

describe('createStatusPie3dTraces', () => {
  it('builds 3D mesh wedges from prepared live chart data', () => {
    const traces = createStatusPie3dTraces([
      { key: 'passed', l: 'Passed', v: 2, p: 50, c: '#138808' },
      { key: 'failed', l: 'Failed', v: 2, p: 50, c: '#DC2626' },
    ], 'sessions');

    expect(traces).toHaveLength(2);
    expect(traces[0].type).toBe('mesh3d');
    expect(traces[0].z).toContain(0);
    expect(traces[0].z).toContain(0.42);
    expect(traces[0].i.length).toBeGreaterThan(100);
    expect(traces[0].facecolor).toContain('#138808');
    expect(traces[0].facecolor).toContain('#0d5c05');
    expect(traces[0].hovertext).toBe('Passed<br>2 sessions (50%)');
  });

  it('returns no traces when there are no positive values', () => {
    expect(createStatusPie3dTraces([])).toEqual([]);
    expect(createStatusPie3dTraces([{ l: 'Draft', v: 0, c: '#003366' }])).toEqual([]);
  });
});
