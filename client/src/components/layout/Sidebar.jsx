import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore.js';
import {
  LayoutDashboard, FlaskConical, Factory, Scale, BookOpen,
  FileCheck, ShieldCheck, ScrollText, Download, Terminal, Building2, ListChecks
} from 'lucide-react';
import './Sidebar.css';

const ALL_ROLES = ['admin', 'reviewer', 'lab_technician', 'lab_admin', 'doca_officer', 'manufacturer', 'auditor'];

const NAV_ITEMS = [
  { to: '/dashboard',         label: 'Dashboard',          icon: LayoutDashboard, roles: ALL_ROLES },
  { to: '/test-sessions',     label: 'Test Sessions',      icon: FlaskConical,    roles: ['admin', 'reviewer', 'lab_technician', 'lab_admin', 'doca_officer', 'manufacturer', 'auditor'] },
  { to: '/instrument-models', label: 'Instrument Models',  icon: Scale,           roles: ['admin', 'reviewer', 'lab_technician', 'lab_admin', 'doca_officer', 'manufacturer'] },
  { to: '/manufacturers',     label: 'Manufacturers',      icon: Factory,         roles: ['admin', 'reviewer', 'lab_admin', 'doca_officer'] },
  { to: '/laboratories',     label: 'Laboratories',       icon: Building2,       roles: ['admin', 'lab_admin', 'doca_officer'] },
  { to: '/test-types',        label: 'Test Procedures',    icon: ListChecks,      roles: ALL_ROLES },
  { to: '/rule-configs',      label: 'OIML Rule Configs',  icon: BookOpen,        roles: ['admin', 'lab_admin', 'doca_officer'] },
  { to: '/reports',           label: 'Reports & Certs',    icon: FileCheck,       roles: ['admin', 'reviewer', 'lab_admin', 'doca_officer', 'auditor'] },
  { to: '/audit-log',         label: 'Audit Trail',        icon: ScrollText,      roles: ['admin', 'reviewer', 'lab_admin', 'doca_officer', 'auditor'] },
  { to: '/export',            label: 'e-Gov Export',       icon: Download,        roles: ['admin', 'lab_admin', 'doca_officer'] },
  { to: '/verify',            label: 'Public Verification',icon: ShieldCheck,     roles: ALL_ROLES },
  { to: '/system-logs',       label: 'Console & Logs',     icon: Terminal,        roles: ['admin', 'lab_admin', 'auditor'] },
];

export default function Sidebar() {
  const { user } = useAuthStore();
  const location = useLocation();
  const role = user?.role || 'admin';

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(role) || role === 'admin');

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav" aria-label="Main navigation">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith(item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`sidebar-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
      <div className="sidebar-footer">
        <span>PS 26035 — OIML R-76</span>
      </div>
    </aside>
  );
}
