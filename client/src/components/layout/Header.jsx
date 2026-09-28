import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore.js';
import { useThemeStore } from '../../store/useThemeStore.js';
import { useNotificationStore } from '../../store/useNotificationStore.js';
import { useTranslation } from '../../config/i18n.js';
import { useOfflineStatus } from '../../services/useOfflineStatus.js';
import { seedDemoData, clearDemoData, getDemoStatus } from '../../services/admin.service.js';
import { useQueryClient } from '@tanstack/react-query';
import { LogOut, User, CheckCircle2, Database, Menu, X, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import OfflineOutboxModal from '../common/OfflineOutboxModal.jsx';
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

export default function Header({ isMobileOpen, onToggleMobileMenu }) {
  const { user, logout } = useAuthStore();
  const { language } = useThemeStore();
  const { t } = useTranslation();
  const addToast = useNotificationStore((s) => s.addToast);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [isDemoActive, setIsDemoActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isOutboxModalOpen, setIsOutboxModalOpen] = useState(false);

  const {
    isOnline,
    pendingCount,
    pendingItems,
    draftSessions,
    isSyncing,
    lastSyncResult,
    syncNow,
    discardDraft,
  } = useOfflineStatus();

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
    <>
      <header className="main-header">
        <div className="header-inner">
          <div className="header-brand">
            <button
              className="mobile-menu-btn"
              onClick={onToggleMobileMenu}
              aria-label="Toggle navigation menu"
            >
              {isMobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>

            <img
              src="/emblem-india.svg"
              alt="National Emblem"
              className="header-emblem"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
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
            {/* Offline Status Badge & Sync trigger */}
            <div className="header-offline-status">
              {!isOnline ? (
                <button
                  className="header-status-badge offline"
                  onClick={() => setIsOutboxModalOpen(true)}
                  title="Click to view offline outbox"
                >
                  <WifiOff size={14} />
                  <span>{t('offline_mode')}</span>
                  {pendingCount > 0 && <span className="pending-pill">{pendingCount}</span>}
                </button>
              ) : pendingCount > 0 ? (
                <button
                  className="header-status-badge pending"
                  onClick={() => setIsOutboxModalOpen(true)}
                  title="Click to view pending outbox items"
                >
                  <RefreshCw size={13} className={isSyncing ? 'spin' : ''} />
                  <span>{pendingCount} {t('pending_sync')}</span>
                </button>
              ) : (
                <span className="header-status-badge online" title="Connected to server">
                  <Wifi size={14} color="#4ADE80" />
                  <span>{t('online_mode')}</span>
                </span>
              )}
            </div>

            {user && ['admin', 'lab_admin'].includes(user.role) && (
              <button
                className={`header-seed-btn ${isDemoActive ? 'active-demo' : ''}`}
                onClick={handleToggleDemoData}
                disabled={loading}
                title={isDemoActive ? 'Click to clear demo sessions' : 'Click to include Legal Metrology demo datasets'}
              >
                {isDemoActive ? <CheckCircle2 size={15} color="#fff" /> : <Database size={15} color="#fff" />}
                <span className="demo-btn-text">
                  {loading
                    ? 'Processing...'
                    : isDemoActive
                    ? '✓ Demo Data'
                    : 'Include Demo Data'}
                </span>
              </button>
            )}

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

      <OfflineOutboxModal
        isOpen={isOutboxModalOpen}
        onClose={() => setIsOutboxModalOpen(false)}
        isOnline={isOnline}
        pendingItems={pendingItems}
        draftSessions={draftSessions}
        isSyncing={isSyncing}
        lastSyncResult={lastSyncResult}
        onSyncNow={syncNow}
        onDiscardDraft={discardDraft}
      />
    </>
  );
}
