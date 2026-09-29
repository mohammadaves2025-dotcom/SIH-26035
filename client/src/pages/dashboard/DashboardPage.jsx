import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getDashboardStats } from '../../services/admin.service.js';
import { useAuthStore } from '../../store/useAuthStore.js';
import { useTranslation } from '../../config/i18n.js';
import {
  FlaskConical, Scale, FileCheck, Factory,
  TrendingUp, AlertCircle, CheckCircle2, Clock
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import './DashboardPage.css';

const STATUS_CONFIG = {
  draft: { label: 'Draft', color: '#1E3A8A' },
  submitted: { label: 'Submitted', color: '#D97706' },
  under_review: { label: 'Under Review', color: '#2563EB' },
  passed: { label: 'Passed', color: '#15803D' },
  failed: { label: 'Failed', color: '#DC2626' },
  report_generated: { label: 'Report Generated', color: '#7C3AED' },
  published: { label: 'Published', color: '#059669' },
};

const chartTooltipStyle = {
  border: '1px solid #CBD5E1',
  borderRadius: 8,
  boxShadow: '0 8px 20px rgba(15, 23, 42, 0.12)',
  backgroundColor: '#FFFFFF',
};

function prepareChartData(data) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  return data.map((item) => ({
    l: item.name,
    v: item.value,
    p: total ? Math.round((item.value / total) * 100) : 0,
    color: item.color,
    key: item.key,
  }));
}

function polarPoint(cx, cy, radius, angle) {
  return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
}

function donutSlicePath(cx, cy, outerRadius, innerRadius, startAngle, endAngle) {
  const startOuter = polarPoint(cx, cy, outerRadius, startAngle);
  const endOuter = polarPoint(cx, cy, outerRadius, endAngle);
  const startInner = polarPoint(cx, cy, innerRadius, startAngle);
  const endInner = polarPoint(cx, cy, innerRadius, endAngle);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;

  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${endOuter.x} ${endOuter.y}`,
    `L ${endInner.x} ${endInner.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${startInner.x} ${startInner.y}`,
    'Z',
  ].join(' ');
}

function darkenColor(color, factor = 0.58) {
  const hex = (typeof color === 'string' ? color : '#1E3A8A').replace('#', '');
  const channels = [0, 2, 4].map((offset) => parseInt(hex.slice(offset, offset + 2), 16));
  return `#${channels.map((channel) => Math.round(channel * factor).toString(16).padStart(2, '0')).join('')}`;
}

function StatusPieChart({ data, emptyMessage, sessionUnit, chartLabel }) {
  if (!data.length) {
    return (
      <div className="status-chart-empty">
        {emptyMessage}
      </div>
    );
  }

  const chartData = prepareChartData(data);
  const total = chartData.reduce((sum, item) => sum + item.v, 0);
  const center = 150;
  const outerRadius = 92;
  const innerRadius = 48;
  const depth = 16;
  let startAngle = -Math.PI / 2;

  return (
    <div className="status-pie-plot" role="img" aria-label={chartLabel}>
      <svg viewBox="0 0 300 360" className="status-pie-svg" aria-hidden="true">
        <g transform="translate(0 8)">
          {chartData.map((item) => {
            const endAngle = startAngle + (item.v / total) * Math.PI * 2;
            const path = donutSlicePath(center, center, outerRadius, innerRadius, startAngle, endAngle);
            const sideColor = darkenColor(item.color);
            startAngle = endAngle;
            return (
              <g key={item.key}>
                {Array.from({ length: depth }, (_, layer) => (
                  <path
                    key={`${item.key}-depth-${layer}`}
                    d={path}
                    fill={sideColor}
                    stroke={sideColor}
                    strokeWidth="3"
                    transform={`translate(0 ${layer + 1})`}
                  />
                ))}
                <path d={path} fill={item.color} stroke="#fff" strokeWidth="3" strokeLinejoin="round">
                  <title>{`${item.l}: ${item.v} ${sessionUnit} (${item.p}%)`}</title>
                </path>
              </g>
            );
          })}
          <text x={center} y={center - 2} textAnchor="middle" className="status-pie-total">{total}</text>
          <text x={center} y={center + 16} textAnchor="middle" className="status-pie-unit">{sessionUnit}</text>
        </g>
      </svg>
      <div className="status-pie-legend">
        {chartData.map((item) => (
          <span key={item.key}>
            <i style={{ backgroundColor: item.color }} />
            {item.l} ({item.p}%)
          </span>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const role = user?.role;

  const { data: stats, isLoading, isError } = useQuery({
    queryKey: ['dashboard-stats', role],
    queryFn: getDashboardStats,
    select: (res) => res?.data || res,
    staleTime: 30_000,
  });

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return t('greeting_morning');
    if (h < 17) return t('greeting_afternoon');
    return t('greeting_evening');
  };

  const statusData = stats?.statusBreakdown
    ? Object.entries(stats.statusBreakdown)
        .map(([key, value]) => ({
          key,
          name: t(`status_${key}`, STATUS_CONFIG[key]?.label || key.replace(/_/g, ' ')),
          value: Number(value) || 0,
          color: STATUS_CONFIG[key]?.color || '#003366',
        }))
        .filter((item) => item.value > 0)
    : [];

  const monthlyData = stats?.monthlyTrend || [];

  if (isError) return <div className="gov-card"><div className="gov-card-body">Unable to load dashboard data. Please try again.</div></div>;

  // Role 1: MANUFACTURER REPRESENTATIVE DASHBOARD
  if (role === 'manufacturer') {
    return (
      <div className="dashboard-page">
        <div className="page-header">
          <div>
            <h1>{greeting()}, {user?.name}</h1>
            <p className="page-header-subtitle">{t('mfr_portal')}</p>
          </div>
          <span className="header-user-role" style={{ padding: '6px 12px', fontSize: 12 }}>Manufacturer Representative</span>
        </div>

        <div className="metric-grid">
          <div className="metric-card">
            <div className="metric-card-top"><div className="metric-card-icon" style={{ background: 'var(--gov-navy-imperial)' }}><Scale size={20} color="#fff" /></div></div>
            <div className="metric-card-label">{t('instruments_registered')}</div>
            <div className="metric-card-value">{isLoading ? '...' : (stats?.totalInstruments ?? '—')}</div>
          </div>
          <div className="metric-card">
            <div className="metric-card-top"><div className="metric-card-icon" style={{ background: 'var(--gov-saffron)' }}><FlaskConical size={20} color="#fff" /></div></div>
            <div className="metric-card-label">{t('total_sessions')}</div>
            <div className="metric-card-value">{isLoading ? '...' : (stats?.totalSessions ?? '—')}</div>
          </div>
          <div className="metric-card">
            <div className="metric-card-top"><div className="metric-card-icon" style={{ background: 'var(--gov-green)' }}><FileCheck size={20} color="#fff" /></div></div>
            <div className="metric-card-label">{t('reports_generated')}</div>
            <div className="metric-card-value">{isLoading ? '...' : (stats?.totalReports ?? '—')}</div>
          </div>
        </div>

        <div className="dashboard-charts">
          <div className="gov-card chart-card">
            <div className="gov-card-header">
              <h4><TrendingUp size={16} style={{ marginRight: 8 }} />{t('monthly_test_sessions')}</h4>
            </div>
            <div className="gov-card-body" style={{ height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={monthlyData} margin={{ top: 12, right: 12, left: 0, bottom: 8 }}>
                  <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="#DCE6F1" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#475569' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#475569' }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip cursor={{ fill: '#EFF6FF' }} contentStyle={chartTooltipStyle} formatter={(value) => [`${value} sessions`, 'Sessions']} />
                  <Bar dataKey="count" fill="#0B4A7A" barSize={32} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="gov-card chart-card">
            <div className="gov-card-header">
              <h4><CheckCircle2 size={16} style={{ marginRight: 8 }} />{t('session_status_breakdown')}</h4>
            </div>
            <div className="gov-card-body status-chart-body" style={{ height: 420, padding: 12 }}>
              <StatusPieChart
                data={statusData}
                emptyMessage={t('no_active_session_data')}
                sessionUnit={t('session_count_unit')}
                chartLabel={t('session_status_breakdown')}
              />
            </div>
          </div>
        </div>

        <div className="gov-card" style={{ marginTop: 20 }}>
          <div className="gov-card-header"><h4>{t('quick_actions')}</h4></div>
          <div className="gov-card-body quick-actions-grid">
            <Link to="/test-sessions" className="quick-action-card"><FlaskConical size={22} /><span>{t('nav_test_sessions')}</span></Link>
            <Link to="/instrument-models" className="quick-action-card"><Scale size={22} /><span>{t('nav_instrument_models')}</span></Link>
            <Link to="/reports" className="quick-action-card"><FileCheck size={22} /><span>{t('nav_test_reports')}</span></Link>
          </div>
        </div>
      </div>
    );
  }

  // Role 2: LAB TECHNICIAN DASHBOARD
  if (role === 'lab_technician') {
    return (
      <div className="dashboard-page">
        <div className="page-header">
          <div>
            <h1>{greeting()}, {user?.name}</h1>
            <p className="page-header-subtitle">{t('lab_portal')} — {user?.labId || 'NPL Delhi Lab'}</p>
          </div>
          <span className="header-user-role" style={{ padding: '6px 12px', fontSize: 12, background: 'var(--gov-green)' }}>Lab Technician</span>
        </div>

        <div className="metric-grid">
          <div className="metric-card">
            <div className="metric-card-top"><div className="metric-card-icon" style={{ background: 'var(--gov-navy-imperial)' }}><FlaskConical size={20} color="#fff" /></div></div>
            <div className="metric-card-label">{t('total_sessions')}</div>
            <div className="metric-card-value">{isLoading ? '...' : (stats?.totalSessions ?? '—')}</div>
          </div>
          <div className="metric-card">
            <div className="metric-card-top"><div className="metric-card-icon" style={{ background: 'var(--gov-saffron)' }}><Clock size={20} color="#fff" /></div></div>
            <div className="metric-card-label">Pending Observations</div>
            <div className="metric-card-value">{isLoading ? '...' : (stats?.statusBreakdown?.draft ?? '—')}</div>
          </div>
          <div className="metric-card">
            <div className="metric-card-top"><div className="metric-card-icon" style={{ background: 'var(--gov-green)' }}><FileCheck size={20} color="#fff" /></div></div>
            <div className="metric-card-label">Under Review</div>
            <div className="metric-card-value">{isLoading ? '...' : (stats?.statusBreakdown?.under_review ?? '—')}</div>
          </div>
        </div>

        <div className="gov-card" style={{ marginTop: 20 }}>
          <div className="gov-card-header"><h4>{t('quick_actions')}</h4></div>
          <div className="gov-card-body quick-actions-grid">
            <Link to="/test-sessions/new" className="quick-action-card"><FlaskConical size={22} /><span>{t('new_test_session')}</span></Link>
            <Link to="/test-sessions" className="quick-action-card"><CheckCircle2 size={22} /><span>{t('nav_test_sessions')}</span></Link>
            <Link to="/instrument-models" className="quick-action-card"><Scale size={22} /><span>{t('nav_instrument_models')}</span></Link>
          </div>
        </div>
      </div>
    );
  }

  // Role 3: SYSTEM ADMIN / REVIEWING OFFICER DASHBOARD
  const metricCards = [
    { label: t('total_sessions'), value: stats?.totalSessions ?? '—', icon: FlaskConical, color: 'var(--gov-navy-imperial)' },
    { label: t('reports_generated'), value: stats?.totalReports ?? '—', icon: FileCheck, color: 'var(--gov-blue-accent)' },
    { label: t('instruments_registered'), value: stats?.totalInstruments ?? '—', icon: Scale, color: 'var(--gov-saffron)' },
    { label: t('manufacturers'), value: stats?.totalManufacturers ?? '—', icon: Factory, color: 'var(--gov-green)' },
  ];

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <div>
          <h1>{greeting()}, {user?.name?.split(' ')[0]}</h1>
          <p className="page-header-subtitle">{t('exec_overview')}</p>
        </div>
        <span className="header-user-role" style={{ padding: '6px 12px', fontSize: 12 }}>{role === 'admin' ? 'System Administrator' : 'Reviewing Officer'}</span>
      </div>

      <div className="metric-grid">
        {metricCards.map((m) => {
          const Icon = m.icon;
          return (
            <div className="metric-card" key={m.label}>
              <div className="metric-card-top">
                <div className="metric-card-icon" style={{ background: m.color }}>
                  <Icon size={20} color="#fff" />
                </div>
              </div>
              <div className="metric-card-label">{m.label}</div>
              <div className="metric-card-value">{isLoading ? '...' : m.value}</div>
            </div>
          );
        })}
      </div>

      <div className="dashboard-charts">
        <div className="gov-card chart-card">
          <div className="gov-card-header">
            <h4><TrendingUp size={16} style={{ marginRight: 8 }} />{t('monthly_test_sessions')}</h4>
          </div>
          <div className="gov-card-body" style={{ height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={monthlyData} margin={{ top: 12, right: 12, left: 0, bottom: 8 }}>
                <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="#DCE6F1" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#475569' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#475569' }} axisLine={false} tickLine={false} width={28} />
                <Tooltip cursor={{ fill: '#EFF6FF' }} contentStyle={chartTooltipStyle} formatter={(value) => [`${value} sessions`, 'Sessions']} />
                <Bar dataKey="count" fill="#0B4A7A" barSize={32} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="gov-card chart-card">
          <div className="gov-card-header">
            <h4><AlertCircle size={16} style={{ marginRight: 8 }} />{t('session_status_breakdown')}</h4>
          </div>
          <div className="gov-card-body status-chart-body" style={{ height: 420, padding: 12 }}>
            <StatusPieChart
              data={statusData}
              emptyMessage={t('no_active_session_data')}
              sessionUnit={t('session_count_unit')}
              chartLabel={t('session_status_breakdown')}
            />
          </div>
        </div>
      </div>

      <div className="gov-card" style={{ marginTop: 20 }}>
        <div className="gov-card-header"><h4>{t('quick_actions')}</h4></div>
        <div className="gov-card-body quick-actions-grid">
          <Link to="/test-sessions/new" className="quick-action-card"><FlaskConical size={22} /><span>{t('new_test_session')}</span></Link>
          <Link to="/verify" className="quick-action-card"><CheckCircle2 size={22} /><span>{t('verify_report')}</span></Link>
          <Link to="/audit-log" className="quick-action-card"><Clock size={22} /><span>{t('audit_trail_action')}</span></Link>
        </div>
      </div>
    </div>
  );
}
