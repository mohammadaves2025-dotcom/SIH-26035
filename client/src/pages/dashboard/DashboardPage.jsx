import React, { useState } from 'react';
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
  draft: { label: 'Draft', color: '#64707C' },
  submitted: { label: 'Submitted', color: '#D97706' },
  under_review: { label: 'Under Review', color: '#374151' },
  passed: { label: 'Passed', color: '#15803D' },
  failed: { label: 'Failed', color: '#DC2626' },
  report_generated: { label: 'Report Generated', color: '#7C3AED' },
  published: { label: 'Published', color: '#059669' },
};

const chartTooltipStyle = {
  border: '1px solid #C9CDD2',
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

function piePoint(cx, cy, rx, ry, angle) {
  return { x: cx + rx * Math.cos(angle), y: cy + ry * Math.sin(angle) };
}

function pieSlicePath(cx, cy, rx, ry, startAngle, endAngle) {
  const start = piePoint(cx, cy, rx, ry, startAngle);
  const end = piePoint(cx, cy, rx, ry, endAngle);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${rx} ${ry} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
}

function StatusPieChart({ data, emptyMessage, sessionUnit, chartLabel }) {
  const [hoveredKey, setHoveredKey] = useState(null);
  const [selectedKey, setSelectedKey] = useState(null);

  if (!data.length) {
    return (
      <div className="status-chart-empty">
        {emptyMessage}
      </div>
    );
  }

  const chartData = prepareChartData(data);
  const total = chartData.reduce((sum, item) => sum + item.v, 0);
  const cx = 140;
  const cy = 135;
  const rx = 112;
  const ry = 112;
  const activeKey = hoveredKey || selectedKey;
  const activeItem = chartData.find((item) => item.key === activeKey);
  let startAngle = -Math.PI / 2;
  const slices = chartData.map((item) => {
    const endAngle = startAngle + (item.v / total) * Math.PI * 2;
    const middleAngle = (startAngle + endAngle) / 2;
    const slice = {
      ...item,
      path: pieSlicePath(cx, cy, rx, ry, startAngle, endAngle),
      offset: { x: 5 * Math.cos(middleAngle), y: 5 * Math.sin(middleAngle) },
    };
    startAngle = endAngle;
    return slice;
  });

  return (
    <div className="status-pie-plot" aria-label={chartLabel}>
      <svg
        className="status-pie-svg"
        viewBox="0 0 280 270"
        role="img"
        aria-label={`${chartLabel}: ${total} ${sessionUnit}`}
      >
        {slices.map((slice) => (
          <path
            key={`${slice.key}-top`}
            d={slice.path}
            fill={slice.color}
            stroke={activeKey === slice.key ? '#25292E' : '#fff'}
            strokeWidth={activeKey === slice.key ? '3' : '1.5'}
            strokeLinejoin="round"
            className={`status-pie-slice${activeKey && activeKey !== slice.key ? ' is-muted' : ''}${activeKey === slice.key ? ' is-active' : ''}`}
            transform={activeKey === slice.key ? `translate(${slice.offset.x} ${slice.offset.y})` : undefined}
            role="button"
            tabIndex={0}
            aria-label={`${slice.l}: ${slice.v} ${sessionUnit}, ${slice.p}%`}
            aria-pressed={selectedKey === slice.key}
            onPointerEnter={() => setHoveredKey(slice.key)}
            onPointerLeave={() => setHoveredKey(null)}
            onFocus={() => setHoveredKey(slice.key)}
            onBlur={() => setHoveredKey(null)}
            onClick={() => setSelectedKey((current) => current === slice.key ? null : slice.key)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setSelectedKey((current) => current === slice.key ? null : slice.key);
              }
            }}
          >
            <title>{`${slice.l}: ${slice.v} ${sessionUnit} (${slice.p}%)`}</title>
          </path>
        ))}
      </svg>
      <div className="status-pie-details">
        <div className="status-pie-total">
          {activeItem ? (
            <>
              <i className="status-pie-active-swatch" style={{ backgroundColor: activeItem.color }} aria-hidden="true" />
              <strong className="status-pie-active-name">{activeItem.l}</strong>
              <span>{activeItem.v} {sessionUnit} ({activeItem.p}%)</span>
            </>
          ) : (
            <>
              <strong>{total}</strong>
              <span>{sessionUnit}</span>
            </>
          )}
        </div>
        <ul className="status-pie-legend" aria-label={chartLabel}>
          {chartData.map((item) => (
            <li
              key={item.key}
              className={activeKey === item.key ? 'is-active' : activeKey ? 'is-muted' : ''}
              style={{ '--status-color': item.color }}
            >
              <button
                type="button"
                className="status-pie-legend-button"
                aria-pressed={selectedKey === item.key}
                onPointerEnter={() => setHoveredKey(item.key)}
                onPointerLeave={() => setHoveredKey(null)}
                onFocus={() => setHoveredKey(item.key)}
                onBlur={() => setHoveredKey(null)}
                onClick={() => setSelectedKey((current) => current === item.key ? null : item.key)}
              >
                <i style={{ backgroundColor: item.color }} aria-hidden="true" />
                <span className="status-pie-legend-name">{item.l}</span>
                <strong>{item.v}</strong>
                <small>{item.p}%</small>
              </button>
            </li>
          ))}
        </ul>
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

  const statusData = stats?.statusBreakdown
    ? Object.entries(stats.statusBreakdown)
        .map(([key, value]) => ({
          key,
          name: t(`status_${key}`, STATUS_CONFIG[key]?.label || key.replace(/_/g, ' ')),
          value: Number(value) || 0,
          color: STATUS_CONFIG[key]?.color || '#3F464F',
        }))
        .filter((item) => item.value > 0)
    : [];

  const monthlyData = stats?.monthlyTrend || [];

  if (isError) return <div className="gov-card"><div className="gov-card-body">Unable to load dashboard data. Please try again.</div></div>;

  // Role 1: MANUFACTURER REPRESENTATIVE DASHBOARD
  if (role === 'manufacturer') {
    return (
      <div className="dashboard-page">
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
                  <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="#E1E4E8" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#475569' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#475569' }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip cursor={{ fill: '#F1F3F5' }} contentStyle={chartTooltipStyle} formatter={(value) => [`${value} sessions`, 'Sessions']} />
                  <Bar dataKey="count" fill="#3F464F" barSize={32} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="gov-card chart-card">
            <div className="gov-card-header">
              <h4><CheckCircle2 size={16} style={{ marginRight: 8 }} />{t('session_status_breakdown')}</h4>
            </div>
            <div className="gov-card-body status-chart-body">
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
                <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="#E1E4E8" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#475569' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#475569' }} axisLine={false} tickLine={false} width={28} />
                <Tooltip cursor={{ fill: '#F1F3F5' }} contentStyle={chartTooltipStyle} formatter={(value) => [`${value} sessions`, 'Sessions']} />
                <Bar dataKey="count" fill="#3F464F" barSize={32} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="gov-card chart-card">
          <div className="gov-card-header">
            <h4><AlertCircle size={16} style={{ marginRight: 8 }} />{t('session_status_breakdown')}</h4>
          </div>
          <div className="gov-card-body status-chart-body">
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
