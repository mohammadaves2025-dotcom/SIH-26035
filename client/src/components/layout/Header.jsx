import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore.js';
import { useThemeStore } from '../../store/useThemeStore.js';
import { useNotificationStore } from '../../store/useNotificationStore.js';
import { useTranslation } from '../../config/i18n.js';
import { useOfflineStatus } from '../../services/useOfflineStatus.js';
import { seedDemoData, clearDemoData, getDemoStatus } from '../../services/admin.service.js';
import { useQueryClient } from '@tanstack/react-query';
import { LogOut, User, Menu, X, WifiOff, RefreshCw } from 'lucide-react';
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
  const setLanguage = useThemeStore((s) => s.setLanguage);
  const { t } = useTranslation();
  const addToast = useNotificationStore((s) => s.addToast);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [isDemoActive, setIsDemoActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isOutboxModalOpen, setIsOutboxModalOpen] = useState(false);
  const roleLabel = user ? ROLE_LABELS[user.role] : null;
  const designationSuffix = roleLabel ? ` (${roleLabel})` : '';
  const displayName = designationSuffix && user?.name?.endsWith(designationSuffix)
    ? user.name.slice(0, -designationSuffix.length)
    : user?.name;

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

  const handleLanguageChange = (nextLanguage) => {
    setLanguage(nextLanguage);
    localStorage.setItem('nawi_lang', nextLanguage.toLowerCase());
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
              src="/ascension-logo.png"
              alt="Ascension"
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
            <label className="header-language-select">
              <select
                value={language}
                onChange={(event) => handleLanguageChange(event.target.value)}
                aria-label="Language"
              >
                <option value="EN">English</option>
                <option value="HI">हिन्दी</option>
              </select>
            </label>
            {!isOnline && (
              <div className="header-offline-status">
                <button
                  className="header-status-badge offline"
                  onClick={() => setIsOutboxModalOpen(true)}
                  title="Click to view offline outbox"
                >
                  <WifiOff size={14} />
                  <span>{t('offline_mode')}</span>
                  {pendingCount > 0 && <span className="pending-pill">{pendingCount}</span>}
                </button>
              </div>
            )}
            {isOnline && pendingCount > 0 && (
              <div className="header-offline-status">
                <button
                  className="header-status-badge pending"
                  onClick={() => setIsOutboxModalOpen(true)}
                  title="Click to view pending outbox items"
                >
                  <RefreshCw size={13} className={isSyncing ? 'spin' : ''} />
                  <span>{pendingCount} {t('pending_sync')}</span>
                </button>
              </div>
            )}

            {user && ['admin', 'lab_admin'].includes(user.role) && (
              <label
                className="header-demo-toggle"
                title={isDemoActive ? 'Uncheck to clear demo sessions' : 'Check to include Legal Metrology demo datasets'}
              >
                <input
                  type="checkbox"
                  checked={isDemoActive}
                  onChange={handleToggleDemoData}
                  disabled={loading}
                  aria-label="Include demo data"
                />
                <span>{loading ? 'Processing...' : 'Include Demo Data'}</span>
              </label>
            )}

            {user && (
              <div className="header-user">
                {user.labId && <span className="header-lab-tag">{user.labId}</span>}
                <div className="header-user-info">
                  <User size={16} />
                  <span className="header-user-name">{displayName}</span>
                  <span className="header-user-role">{ROLE_LABELS[user.role] || user.role}</span>
                </div>
                <button className="header-logout-btn" onClick={handleLogout} title="Logout" aria-label="Logout">
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
