import React from 'react';
import { useTranslation } from '../../config/i18n.js';
import './Footer.css';

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="gov-footer">
      <p>© {new Date().getFullYear()} {t('footer_department')}</p>
      <p>{t('footer_maintained')}</p>
    </footer>
  );
}
