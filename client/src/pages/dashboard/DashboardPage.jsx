import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getDashboardStats } from '../../services/admin.service.js';
import { useAuthStore } from '../../store/useAuthStore.js';
import {
  FlaskConical, Scale, FileCheck, Factory,
  TrendingUp, AlertCircle, CheckCircle2, Clock, ShieldCheck, Building2
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import './DashboardPage.css';

const PIE_COLORS = ['#003366', '#D97706', '#138808', '#DC2626', '#D4AF37'];

export default function DashboardPage() {
  const { user } = useAuthStore();
  const role = user?.role;

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats', role],
    queryFn: getDashboardStats,
    select: (res) => res?.data || res,
    staleTime: 30_000,
  });

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const statusData = stats?.statusBreakdown
    ? Object.entries(stats.statusBreakdown).map(([name, value]) => ({ name, value }))
    : [];

  const monthlyData = stats?.monthlyTrend || [];

  // Role 1: MANUFACTURER REPRESENTATIVE DASHBOARD
  if (role === 'manufacturer') {
    return (
      <div className="dashboard-page">
        <div className="page-header">
          <div>
            <h1>{greeting()}, {user?.name}</h1>
            <p className="page-header-subtitle">Manufacturer Portal — Type Approval & Evaluation Tracking</p>
          </div>
          <span className="header-user-role" style={{ padding: '6px 12px', fontSize: 12 }}>Manufacturer Representative</span>
        </div>

        <div className="metric-grid">
          <div className="metric-card">
            <div className="metric-card-top"><div className="metric-card-icon" style={{ background: 'var(--gov-navy-imperial)' }}><Scale size={20} color="#fff" /></div></div>
            <div className="metric-card-label">Registered Models</div>
            <div className="metric-card-value">{isLoading ? '...' : (stats?.totalInstruments ?? '—')}</div>
          </div>
          <div className="metric-card">
            <div className="metric-card-top"><div className="metric-card-icon" style={{ background: 'var(--gov-saffron)' }}><FlaskConical size={20} color="#fff" /></div></div>
            <div className="metric-card-label">Submitted Test Sessions</div>
            <div className="metric-card-value">{isLoading ? '...' : (stats?.totalSessions ?? '—')}</div>
          </div>
          <div className="metric-card">
            <div className="metric-card-top"><div className="metric-card-icon" style={{ background: 'var(--gov-green)' }}><FileCheck size={20} color="#fff" /></div></div>
            <div className="metric-card-label">Available Test Reports</div>
            <div className="metric-card-value">{isLoading ? '...' : (stats?.totalReports ?? '—')}</div>
          </div>
        </div>

        <div className="dashboard-charts">
          <div className="gov-card chart-card">
            <div className="gov-card-header">
              <h4><TrendingUp size={16} style={{ marginRight: 8 }} />Evaluation Progress & Submissions</h4>
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
              <h4><CheckCircle2 size={16} style={{ marginRight: 8 }} />Test Session Statuses</h4>
            </div>
            <div className="gov-card-body" style={{ height: 300 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" outerRadius={90} innerRadius={45} dataKey="value" label>
                    {statusData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="gov-card" style={{ marginTop: 20 }}>
          <div className="gov-card-header"><h4>Manufacturer Quick Actions</h4></div>
          <div className="gov-card-body quick-actions-grid">
            <a href="/test-sessions" className="quick-action-card"><FlaskConical size={22} /><span>My Submissions</span></a>
            <a href="/instrument-models" className="quick-action-card"><Scale size={22} /><span>View Models</span></a>
            <a href="/reports" className="quick-action-card"><FileCheck size={22} /><span>View Test Reports</span></a>
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
            <p className="page-header-subtitle">Laboratory Metrologist Portal — {user?.labId || 'NPL Delhi Lab'}</p>
          </div>
          <span className="header-user-role" style={{ padding: '6px 12px', fontSize: 12, background: 'var(--gov-green)' }}>Lab Technician</span>
        </div>

        <div className="metric-grid">
          <div className="metric-card">
            <div className="metric-card-top"><div className="metric-card-icon" style={{ background: 'var(--gov-navy-imperial)' }}><FlaskConical size={20} color="#fff" /></div></div>
            <div className="metric-card-label">My Lab Sessions</div>
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
          <div className="gov-card-header"><h4>Technician Testing Actions</h4></div>
          <div className="gov-card-body quick-actions-grid">
            <a href="/test-sessions/new" className="quick-action-card"><FlaskConical size={22} /><span>+ New Test Session</span></a>
            <a href="/test-sessions" className="quick-action-card"><CheckCircle2 size={22} /><span>Pending Test Sessions</span></a>
            <a href="/instrument-models" className="quick-action-card"><Scale size={22} /><span>Instrument Models</span></a>
          </div>
        </div>
      </div>
    );
  }

  // Role 3: SYSTEM ADMIN / REVIEWING OFFICER DASHBOARD
  const metricCards = [
    { label: 'Total Sessions', value: stats?.totalSessions ?? '—', icon: FlaskConical, color: 'var(--gov-navy-imperial)' },
    { label: 'Reports Generated', value: stats?.totalReports ?? '—', icon: FileCheck, color: 'var(--gov-blue-accent)' },
    { label: 'Instruments Registered', value: stats?.totalInstruments ?? '—', icon: Scale, color: 'var(--gov-saffron)' },
    { label: 'Manufacturers', value: stats?.totalManufacturers ?? '—', icon: Factory, color: 'var(--gov-green)' },
  ];

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <div>
          <h1>{greeting()}, {user?.name?.split(' ')[0]}</h1>
          <p className="page-header-subtitle">NAWI Digital Metrology — Executive System Overview</p>
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
            <h4><TrendingUp size={16} style={{ marginRight: 8 }} />Monthly Test Sessions</h4>
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
            <h4><AlertCircle size={16} style={{ marginRight: 8 }} />Session Status Breakdown</h4>
          </div>
          <div className="gov-card-body" style={{ height: 300 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" outerRadius={100} innerRadius={50} dataKey="value" labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {statusData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="gov-card" style={{ marginTop: 20 }}>
        <div className="gov-card-header"><h4>Quick Actions</h4></div>
        <div className="gov-card-body quick-actions-grid">
          <a href="/test-sessions/new" className="quick-action-card"><FlaskConical size={22} /><span>New Test Session</span></a>
          <a href="/verify" className="quick-action-card"><CheckCircle2 size={22} /><span>Verify Report</span></a>
          <a href="/audit-log" className="quick-action-card"><Clock size={22} /><span>Audit Trail</span></a>
        </div>
      </div>
    </div>
  );
}
