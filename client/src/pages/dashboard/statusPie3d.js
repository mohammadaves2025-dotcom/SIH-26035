const PIE_HEIGHT = 0.42;
const INNER_RADIUS = 0.48;
const OUTER_RADIUS = 1;
const MAX_ARC_STEP = Math.PI / 48;

function darkenColor(color, factor = 0.68) {
  const hex = color.replace('#', '');
  const channels = hex.length === 3
    ? hex.split('').map((digit) => parseInt(digit + digit, 16))
    : [0, 2, 4].map((offset) => parseInt(hex.slice(offset, offset + 2), 16));

  return `#${channels.map((channel) => Math.round(channel * factor).toString(16).padStart(2, '0')).join('')}`;
}

function createSliceMesh(item, startAngle, endAngle, sessionUnit) {
  const steps = Math.max(2, Math.ceil((endAngle - startAngle) / MAX_ARC_STEP));
  const x = [];
  const y = [];
  const z = [];
  const topOuter = [];
  const topInner = [];
  const bottomOuter = [];
  const bottomInner = [];

  for (let step = 0; step <= steps; step += 1) {
    const angle = startAngle + ((endAngle - startAngle) * step) / steps;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    topOuter.push(x.length);
    x.push(OUTER_RADIUS * cos);
    y.push(OUTER_RADIUS * sin);
    z.push(PIE_HEIGHT);

    topInner.push(x.length);
    x.push(INNER_RADIUS * cos);
    y.push(INNER_RADIUS * sin);
    z.push(PIE_HEIGHT);

    bottomOuter.push(x.length);
    x.push(OUTER_RADIUS * cos);
    y.push(OUTER_RADIUS * sin);
    z.push(0);

    bottomInner.push(x.length);
    x.push(INNER_RADIUS * cos);
    y.push(INNER_RADIUS * sin);
    z.push(0);
  }

  const i = [];
  const j = [];
  const k = [];
  const facecolor = [];
  const sideColor = darkenColor(item.c);
  const innerSideColor = darkenColor(item.c, 0.48);

  const addTriangle = (a, b, c, color) => {
    i.push(a);
    j.push(b);
    k.push(c);
    facecolor.push(color);
  };

  for (let step = 0; step < steps; step += 1) {
    addTriangle(topOuter[step], topOuter[step + 1], topInner[step], item.c);
    addTriangle(topInner[step], topOuter[step + 1], topInner[step + 1], item.c);

    addTriangle(bottomOuter[step], bottomInner[step], bottomOuter[step + 1], sideColor);
    addTriangle(bottomInner[step], bottomInner[step + 1], bottomOuter[step + 1], sideColor);

    addTriangle(topOuter[step], bottomOuter[step], topOuter[step + 1], sideColor);
    addTriangle(bottomOuter[step], bottomOuter[step + 1], topOuter[step + 1], sideColor);

    addTriangle(topInner[step], topInner[step + 1], bottomInner[step], innerSideColor);
    addTriangle(bottomInner[step], topInner[step + 1], bottomInner[step + 1], innerSideColor);
  }

  const startTopOuter = topOuter[0];
  const startTopInner = topInner[0];
  const startBottomOuter = bottomOuter[0];
  const startBottomInner = bottomInner[0];
  addTriangle(startTopOuter, startTopInner, startBottomOuter, sideColor);
  addTriangle(startTopInner, startBottomInner, startBottomOuter, sideColor);

  const end = steps;
  addTriangle(topOuter[end], bottomOuter[end], topInner[end], sideColor);
  addTriangle(topInner[end], bottomOuter[end], bottomInner[end], sideColor);

  return {
    type: 'mesh3d',
    name: item.l,
    x,
    y,
    z,
    i,
    j,
    k,
    facecolor,
    flatshading: true,
    lighting: {
      ambient: 0.72,
      diffuse: 0.8,
      specular: 0.18,
      roughness: 0.68,
      fresnel: 0.08,
    },
    lightposition: { x: 100, y: 150, z: 300 },
    hovertext: `${item.l}<br>${item.v} ${sessionUnit} (${item.p}%)`,
    hoverinfo: 'text',
    showlegend: true,
  };
}

export function createStatusPie3dTraces(data, sessionUnit = 'sessions') {
  const total = data.reduce((sum, item) => sum + item.v, 0);
  if (total <= 0) return [];

  let startAngle = -Math.PI / 2;
  return data.filter((item) => item.v > 0).map((item) => {
    const endAngle = startAngle + (item.v / total) * Math.PI * 2;
    const gap = Math.min(0.008, (endAngle - startAngle) / 10);
    const trace = createSliceMesh(item, startAngle + gap, endAngle - gap, sessionUnit);
    startAngle = endAngle;
    return trace;
  });
}
