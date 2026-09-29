import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore.js';
import { useThemeStore } from '../../store/useThemeStore.js';
import { login } from '../../services/auth.service.js';
import { useNotificationStore } from '../../store/useNotificationStore.js';
import { useTranslation } from '../../config/i18n.js';
import { Scale, Eye, EyeOff } from 'lucide-react';
import './LoginPage.css';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const addToast = useNotificationStore((s) => s.addToast);
  const { language } = useThemeStore();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await login({ email, password });
      setAuth({ token: res.data.token, user: res.data.user });
      addToast({ type: 'success', message: `Welcome, ${res.data.user.name}` });
      navigate('/dashboard');
    } catch {
      // error toast is handled by apiClient interceptor
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <img src="/emblem-india.svg" alt="National Emblem" className="login-emblem" onError={(e) => { e.target.style.display = 'none'; }} />
          <h1>{language === 'HI' ? 'NAWI डिजिटल मापविज्ञान प्रणाली' : 'NAWI Digital Metrology System'}</h1>
          <p className="login-dept">
            {language === 'HI'
              ? 'उपभोक्ता मामले विभाग — विधिक मापविज्ञान प्रभाग'
              : 'Department of Consumer Affairs — Legal Metrology Division'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="gov-form-group">
            <label className="gov-label" htmlFor="email">{t('login_email')}</label>
            <input
              id="email"
              data-testid="login-email"
              type="email"
              className="gov-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@nawi.gov.in"
              required
              autoFocus
            />
          </div>

          <div className="gov-form-group">
            <label className="gov-label" htmlFor="password">{t('login_password')}</label>
            <div className="login-pw-wrap">
              <input
                id="password"
                data-testid="login-password"
                type={showPw ? 'text' : 'password'}
                className="gov-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
              <button type="button" aria-label={showPw ? 'Hide password' : 'Show password'} className="login-pw-toggle" onClick={() => setShowPw(!showPw)} tabIndex={-1}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" data-testid="login-submit" className="gov-btn gov-btn-primary login-submit" disabled={loading}>
            <Scale size={16} />
            {loading ? t('login_authenticating') : t('login_sign_in')}
          </button>
        </form>

        <div className="login-demo-creds">
          <p style={{ marginBottom: 8 }}><strong>{t('login_demo')}</strong></p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <button type="button" className="gov-btn gov-btn-outline" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => { setEmail('admin@nawi.gov.in'); setPassword('Password123!'); }}>
              Admin
            </button>
            <button type="button" className="gov-btn gov-btn-outline" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => { setEmail('tech@npl.res.in'); setPassword('Password123!'); }}>
              Lab Tech
            </button>
            <button type="button" className="gov-btn gov-btn-outline" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => { setEmail('reviewer@doca.gov.in'); setPassword('Password123!'); }}>
              Reviewer
            </button>
            <button type="button" className="gov-btn gov-btn-outline" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => { setEmail('labadmin@npl.res.in'); setPassword('Password123!'); }}>
              Lab Admin
            </button>
            <button type="button" className="gov-btn gov-btn-outline" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => { setEmail('officer@doca.gov.in'); setPassword('Password123!'); }}>
              DoCA Officer
            </button>
            <button type="button" className="gov-btn gov-btn-outline" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => { setEmail('rep@averyindia.com'); setPassword('Password123!'); }}>
              Manufacturer
            </button>
            <button type="button" className="gov-btn gov-btn-outline" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => { setEmail('auditor@nawi.gov.in'); setPassword('Password123!'); }}>
              Auditor
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
