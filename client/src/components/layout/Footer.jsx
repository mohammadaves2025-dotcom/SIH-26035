import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore.js';
import './Footer.css';

export default function Footer() {
  const { pathname } = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasSidebar = isAuthenticated && pathname !== '/login';

  return (
    <footer className={`gov-footer ${hasSidebar ? '' : 'gov-footer-full'}`}>
      <p>© {new Date().getFullYear()} ASCENSION. All rights reserved.</p>
    </footer>
  );
}
