import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore.js';
import { useTranslation } from '../../config/i18n.js';
import {
  LayoutDashboard, FlaskConical, Factory, Scale, BookOpen,
  FileCheck, ShieldCheck, ScrollText, Download, Terminal, Building2, ListChecks,
  Users as UsersIcon,
} from 'lucide-react';
import './Sidebar.css';

const ALL_ROLES = ['admin', 'metrology_expert', 'reviewer', 'lab_technician', 'lab_admin', 'doca_officer', 'manufacturer', 'auditor'];

export default function Sidebar({ isMobileOpen, onCloseMobileMenu }) {
  const { user } = useAuthStore();
  const location = useLocation();
  const { t } = useTranslation();
  const role = user?.role || 'admin';

  const NAV_ITEMS = [
    { to: '/dashboard',         label: t('nav_dashboard'),          icon: LayoutDashboard, roles: ALL_ROLES },
    { to: '/test-sessions',     label: t('nav_test_sessions'),      icon: FlaskConical,    roles: ['admin', 'reviewer', 'lab_technician', 'lab_admin', 'doca_officer', 'manufacturer', 'auditor'] },
    { to: '/instrument-models', label: t('nav_instrument_models'),  icon: Scale,           roles: ['admin', 'reviewer', 'lab_technician', 'lab_admin', 'doca_officer', 'manufacturer'] },
    { to: '/manufacturers',     label: t('nav_manufacturers'),      icon: Factory,         roles: ['admin', 'reviewer', 'lab_admin', 'doca_officer'] },
    { to: '/laboratories',     label: t('nav_laboratories'),       icon: Building2,       roles: ['admin', 'lab_admin', 'doca_officer'] },
    { to: '/test-types',        label: t('nav_test_procedures'),    icon: ListChecks,      roles: ALL_ROLES },
    { to: '/rule-configs',      label: t('nav_rule_configs'),       icon: BookOpen,        roles: ['admin', 'metrology_expert', 'lab_admin', 'doca_officer', 'reviewer', 'auditor'] },
    { to: '/reports',           label: t('nav_test_reports'),       icon: FileCheck,       roles: ['admin', 'reviewer', 'lab_admin', 'doca_officer', 'auditor', 'manufacturer'] },
    { to: '/audit-log',         label: t('nav_audit_trail'),        icon: ScrollText,      roles: ['admin', 'reviewer', 'lab_admin', 'doca_officer', 'auditor'] },
    { to: '/export',            label: t('nav_egov_export'),        icon: Download,        roles: ['admin', 'lab_admin', 'doca_officer', 'auditor'] },
    { to: '/verify',            label: t('nav_public_verification'),icon: ShieldCheck,     roles: ALL_ROLES },
    { to: '/users',            label: t('nav_users'),               icon: UsersIcon,       roles: ['admin', 'lab_admin'] },
    { to: '/system-logs',       label: t('nav_system_logs'),        icon: Terminal,        roles: ['admin', 'lab_admin', 'auditor'] },
  ];

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(role) || role === 'admin');

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="sidebar-backdrop"
          onClick={onCloseMobileMenu}
          aria-hidden="true"
        />
      )}

      <aside className={`sidebar ${isMobileOpen ? 'mobile-open' : ''}`}>
        <nav className="sidebar-nav" aria-label="Main navigation">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`sidebar-link ${isActive ? 'active' : ''}`}
                onClick={onCloseMobileMenu}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <span>{t('sidebar_footer')}</span>
        </div>
      </aside>
    </>
  );
}