import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore.js';
import { useThemeStore } from '../../store/useThemeStore.js';
import { useNotificationStore } from '../../store/useNotificationStore.js';
import { seedDemoData, clearDemoData, getDemoStatus } from '../../services/admin.service.js';
import { useQueryClient } from '@tanstack/react-query';
import { LogOut, User, CheckCircle2, Database } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './Header.css';

const ROLE_LABELS = {
  admin: 'System Administrator',
  metrology_expert: 'Metrology Domain Expert',
  lab_technician: 'Lab Technician',
  reviewer: 'Reviewing Officer',
  lab_admin: 'Laboratory Administrator',
  doca_officer: 'Legal Metrology Officer / DoCA',
  manufacturer: 'Manufacturer Rep',
  auditor: 'Metrology Auditor',
};

export default function Header() {
  const { user, logout } = useAuthStore();
  const { language } = useThemeStore();
  const addToast = useNotificationStore((s) => s.addToast);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [isDemoActive, setIsDemoActive] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getDemoStatus()
      .then((res) => {
        setIsDemoActive(res?.data?.isDemoDataIncluded ?? true);
      })
      .catch(() => {});
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleToggleDemoData = async () => {
    setLoading(true);
    try {
      if (isDemoActive) {
        await clearDemoData();
        setIsDemoActive(false);
        addToast({
          type: 'info',
          message: 'Demo test sessions cleared from database.',
        });
      } else {
        await seedDemoData();
        setIsDemoActive(true);
        addToast({
          type: 'success',
          message: 'Legal Metrology demo datasets (Act 2009 & Rules 2011) populated successfully!',
        });
      }
      await queryClient.invalidateQueries();
    } catch {
      // Error handled by apiClient interceptor
    } finally {
      setLoading(false);
    }
  };

  return (
    <header className="main-header">
      <div className="header-inner">
        <div className="header-brand">
          <img src="/emblem-india.svg" alt="National Emblem" className="header-emblem" onError={(e) => { e.target.style.display = 'none'; }} />
          <div className="header-titles">
            <h1 className="header-title">
              {language === 'HI'
                ? 'NAWI डिजिटल मापविज्ञान प्रणाली'
                : 'NAWI Digital Metrology System'}
            </h1>
            <span className="header-subtitle">
              {language === 'HI'
                ? 'OIML R-76 अनुपालन परीक्षण रिपोर्ट जनरेशन'
                : 'OIML R-76 Compliant Test Report Generation'}
            </span>
          </div>
        </div>

        <div className="header-actions">
          <button
            className={`header-seed-btn ${isDemoActive ? 'active-demo' : ''}`}
            onClick={handleToggleDemoData}
            disabled={loading}
            title={isDemoActive ? 'Click to clear demo sessions' : 'Click to include Legal Metrology demo datasets'}
          >
            {isDemoActive ? <CheckCircle2 size={15} color="#fff" /> : <Database size={15} color="#fff" />}
            <span>
              {loading
                ? 'Processing...'
                : isDemoActive
                ? '✓ Demo Data Included'
                : 'Include Demo Data'}
            </span>
          </button>

          {user && (
            <div className="header-user">
              {user.labId && <span className="header-lab-tag">{user.labId}</span>}
              <div className="header-user-info">
                <User size={16} />
                <span className="header-user-name">{user.name}</span>
                <span className="header-user-role">{ROLE_LABELS[user.role] || user.role}</span>
              </div>
              <button className="header-logout-btn" onClick={handleLogout} title="Logout">
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
