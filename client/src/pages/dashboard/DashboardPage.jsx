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
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import './DashboardPage.css';

const STATUS_CONFIG = {
  draft: { label: 'Draft', color: '#003366' },
  submitted: { label: 'Submitted', color: '#D97706' },
  under_review: { label: 'Under Review', color: '#2563EB' },
  passed: { label: 'Passed', color: '#138808' },
  failed: { label: 'Failed', color: '#DC2626' },
  report_generated: { label: 'Report Generated', color: '#7C3AED' },
  published: { label: 'Published', color: '#059669' },
};

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const role = user?.role;

  const { data: stats, isLoading } = useQuery({
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
          name: STATUS_CONFIG[key]?.label || key.replace(/_/g, ' '),
          value: Number(value) || 0,
          color: STATUS_CONFIG[key]?.color || '#003366',
        }))
        .filter((item) => item.value > 0)
    : [];

  const monthlyData = stats?.monthlyTrend || [];

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
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="var(--gov-navy-imperial)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="gov-card chart-card">
            <div className="gov-card-header">
              <h4><CheckCircle2 size={16} style={{ marginRight: 8 }} />{t('session_status_breakdown')}</h4>
            </div>
            <div className="gov-card-body" style={{ height: 320, padding: 16 }}>
              {statusData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="42%"
                      outerRadius={75}
                      innerRadius={42}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={true}
                    >
                      {statusData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val, name) => [`${val} sessions`, name]} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748B', fontSize: 13 }}>
                  No active session data to display
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="gov-card" style={{ marginTop: 20 }}>
          <div className="gov-card-header"><h4>{t('quick_actions')}</h4></div>
          <div className="gov-card-body quick-actions-grid">
            <Link to="/test-sessions" className="quick-action-card"><FlaskConical size={22} /><span>My Submissions</span></Link>
            <Link to="/instrument-models" className="quick-action-card"><Scale size={22} /><span>View Models</span></Link>
            <Link to="/reports" className="quick-action-card"><FileCheck size={22} /><span>View Test Reports</span></Link>
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
            <Link to="/test-sessions" className="quick-action-card"><CheckCircle2 size={22} /><span>Pending Test Sessions</span></Link>
            <Link to="/instrument-models" className="quick-action-card"><Scale size={22} /><span>Instrument Models</span></Link>
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
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="var(--gov-navy-imperial)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="gov-card chart-card">
          <div className="gov-card-header">
            <h4><AlertCircle size={16} style={{ marginRight: 8 }} />{t('session_status_breakdown')}</h4>
          </div>
          <div className="gov-card-body" style={{ height: 320, padding: 16 }}>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="42%"
                    outerRadius={80}
                    innerRadius={45}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={true}
                  >
                    {statusData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val, name) => [`${val} sessions`, name]} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748B', fontSize: 13 }}>
                No active session data to display
              </div>
            )}
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

