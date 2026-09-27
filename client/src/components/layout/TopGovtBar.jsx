import React from 'react';
import { useThemeStore } from '../../store/useThemeStore.js';
import './TopGovtBar.css';

export default function TopGovtBar() {
  const { fontSizeStep, setFontSizeStep, highContrast, toggleHighContrast, language, setLanguage } = useThemeStore();

  return (
    <>
      <div className="tricolor-stripe" aria-hidden="true">
        <span className="tricolor-saffron" />
        <span className="tricolor-white" />
        <span className="tricolor-green" />
      </div>
      <div className="topbar">
        <div className="topbar-inner">
          <div className="topbar-left">
            <a href="#main-content" className="skip-link">Skip to main content</a>
            <span className="topbar-dept">
              {language === 'HI'
                ? 'भारत सरकार | उपभोक्ता मामले विभाग — विधिक मापविज्ञान प्रभाग'
                : 'Government of India | Dept. of Consumer Affairs — Legal Metrology Division'}
            </span>
          </div>
          <div className="topbar-right">
            <div className="topbar-font-group" role="group" aria-label="Font size">
              {[-1, 0, 1].map((step) => (
                <button
                  key={step}
                  className={`topbar-font-btn ${fontSizeStep === step ? 'active' : ''}`}
                  onClick={() => setFontSizeStep(step)}
                >
                  {step === -1 ? 'A−' : step === 0 ? 'A' : 'A+'}
                </button>
              ))}
            </div>
            <span className="topbar-sep">|</span>
            <button className="topbar-btn" onClick={toggleHighContrast}>
              {highContrast ? 'Standard' : 'High Contrast'}
            </button>
            <span className="topbar-sep">|</span>
            <button className="topbar-btn" onClick={() => setLanguage(language === 'EN' ? 'HI' : 'EN')}>
              {language === 'EN' ? 'हिन्दी' : 'English'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
