import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles/index.css';
import { registerSW } from 'virtual:pwa-register';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// vite-plugin-pwa auto-update registration
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('New version available. Reload?')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('[PWA] App is ready to work offline.');
  },
});

// Replay outbox when connectivity resumes
window.addEventListener('online', async () => {
  try {
    const { replayOutbox } = await import('./services/offlineSync.js');
    const authStore = JSON.parse(localStorage.getItem('auth-storage') || '{}');
    const token = authStore?.state?.token;
    if (token) {
      const result = await replayOutbox(token);
      console.log('[OfflineSync] Outbox replayed:', result);
    }
  } catch (err) {
    console.warn('[OfflineSync] Auto-replay failed:', err.message);
  }
});
